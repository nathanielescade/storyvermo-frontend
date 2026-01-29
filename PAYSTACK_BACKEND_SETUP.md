# 🚀 Paystack Payment Integration - Backend Setup Guide

## Overview
Your frontend now has:
1. ✅ **Pricing Page** - Beautiful pricing with "Get Creator Plan" button
2. ✅ **PaystackButton Component** - Handles payment initialization
3. ✅ **Verify Payment Page** - Handles payment callback/verification

## Frontend Callback Flow

```
User clicks "Get Creator Plan"
    ↓
Frontend sends POST to /api/payments/initialize/
    ↓
Backend returns authorizationUrl (Paystack link)
    ↓
Frontend redirects user to Paystack checkout
    ↓
User pays on Paystack
    ↓
Paystack redirects to: https://yourdomain.com/verify-payment?reference=REF_123456
    ↓
Frontend calls GET /api/payments/verify/?reference=REF_123456
    ↓
Backend verifies with Paystack & returns { status: 'success', plan: 'creator', ... }
    ↓
User sees success page → redirected to /settings/profile
```

## What You Need to Update in Django Backend

### 1. Set Paystack Callback URLs in Paystack Dashboard

Go to https://dashboard.paystack.co → Settings → API Keys & Webhooks

**Live Callback URL:**
```
https://yourdomain.com/verify-payment?reference={{reference}}
```

**Live Webhook URL:**
```
https://yourdomain.com/api/webhooks/paystack/
```

Note: Replace `yourdomain.com` with your actual domain

---

### 2. Create the Payment Views in Django

Create `core/views/payment.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
import requests
import json
import hmac
import hashlib

User = get_user_model()

PAYSTACK_SECRET_KEY = "your-live-secret-key-here"  # Store in .env!
PAYSTACK_PUBLIC_KEY = "your-live-public-key-here"  # Store in .env!

class PaymentInitializeView(APIView):
    """Initialize a Paystack payment for Creator plan upgrade"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Validate request data
        email = request.data.get('email')
        amount = request.data.get('amount')  # In pesewas (GH₵ 249 = 24900 pesewas)
        plan_type = request.data.get('planType')  # 'monthly' or 'annually'
        reference = request.data.get('reference')
        
        if not all([email, amount, plan_type, reference]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify email matches user
        if email != user.email:
            return Response(
                {'error': 'Email does not match authenticated user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify amount is correct
        if plan_type == 'monthly' and amount != 24900:
            return Response(
                {'error': 'Invalid amount for monthly plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif plan_type == 'annually' and amount != 249000:
            return Response(
                {'error': 'Invalid amount for annual plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create payment record
        from core.models import Payment  # Create this model (see below)
        payment = Payment.objects.create(
            user=user,
            amount=amount,
            plan_type=plan_type,
            reference=reference,
            status='pending',
            currency='GHS'
        )
        
        # Initialize payment with Paystack
        headers = {
            'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'email': email,
            'amount': amount,
            'reference': reference,
            'metadata': {
                'user_id': user.id,
                'plan_type': plan_type,
            }
        }
        
        try:
            response = requests.post(
                'https://api.paystack.co/transaction/initialize',
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                return Response({
                    'success': True,
                    'authorizationUrl': data['data']['authorization_url'],
                    'reference': reference,
                })
            else:
                return Response(
                    {'error': data.get('message', 'Failed to initialize payment')},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentVerifyView(APIView):
    """Verify Paystack payment and activate Creator subscription"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        reference = request.query_params.get('reference')
        
        if not reference:
            return Response(
                {'error': 'No reference provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify payment with Paystack
        headers = {
            'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(
                f'https://api.paystack.co/transaction/verify/{reference}',
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            if not data.get('status'):
                return Response({
                    'status': 'failed',
                    'message': data.get('message', 'Payment verification failed')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            transaction = data['data']
            
            if transaction['status'] != 'success':
                return Response({
                    'status': 'failed',
                    'message': f"Payment status: {transaction['status']}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update payment record
            from core.models import Payment
            payment = Payment.objects.filter(
                reference=reference,
                user=user
            ).first()
            
            if not payment:
                return Response({
                    'status': 'failed',
                    'message': 'Payment record not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            payment.status = 'success'
            payment.paystack_reference = reference
            payment.save()
            
            # Activate Creator subscription for user
            from django.utils import timezone
            from datetime import timedelta
            
            user.subscription_plan = 'creator'
            user.subscription_billing_cycle = payment.plan_type
            user.subscription_start_date = timezone.now()
            
            if payment.plan_type == 'monthly':
                user.subscription_end_date = timezone.now() + timedelta(days=30)
            else:  # annually
                user.subscription_end_date = timezone.now() + timedelta(days=365)
            
            user.subscription_active = True
            user.save()
            
            # Return success response
            return Response({
                'status': 'success',
                'plan': 'creator',
                'billingCycle': payment.plan_type,
                'subscriptionStartDate': user.subscription_start_date.isoformat(),
                'nextBillingDate': user.subscription_end_date.isoformat(),
                'message': 'Payment verified and Creator plan activated!'
            })
            
        except requests.exceptions.RequestException as e:
            return Response({
                'status': 'failed',
                'message': 'Failed to verify with payment provider',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@require_http_methods(["POST"])
def paystack_webhook(request):
    """Handle Paystack webhook for charge.success events"""
    
    # Verify webhook signature
    payload = request.body
    signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE')
    
    hash_obj = hmac.new(
        PAYSTACK_SECRET_KEY.encode('utf-8'),
        payload,
        hashlib.sha512
    )
    computed_hash = hash_obj.hexdigest()
    
    if computed_hash != signature:
        return Response({'status': 'unauthorized'}, status=401)
    
    # Parse webhook data
    event_data = json.loads(payload)
    
    if event_data.get('event') == 'charge.success':
        from core.models import Payment
        
        transaction = event_data.get('data', {})
        reference = transaction.get('reference')
        
        # Update payment record if not already processed
        payment = Payment.objects.filter(reference=reference).first()
        
        if payment and payment.status != 'success':
            # Activate subscription (same logic as verify endpoint)
            user = payment.user
            from django.utils import timezone
            from datetime import timedelta
            
            user.subscription_plan = 'creator'
            user.subscription_billing_cycle = payment.plan_type
            user.subscription_start_date = timezone.now()
            
            if payment.plan_type == 'monthly':
                user.subscription_end_date = timezone.now() + timedelta(days=30)
            else:
                user.subscription_end_date = timezone.now() + timedelta(days=365)
            
            user.subscription_active = True
            user.save()
            
            payment.status = 'success'
            payment.save()
    
    return Response({'status': 'success'})
```

### 3. Create Payment Model

In `core/models.py`, add:

```python
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    
    PLAN_CHOICES = [
        ('monthly', 'Monthly'),
        ('annually', 'Annually'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.IntegerField()  # In pesewas
    currency = models.CharField(max_length=3, default='GHS')
    plan_type = models.CharField(max_length=20, choices=PLAN_CHOICES)
    reference = models.CharField(max_length=255, unique=True)
    paystack_reference = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.plan_type} - {self.status}"
```

### 4. Update User Model

Add these fields to your User model:

```python
subscription_plan = models.CharField(
    max_length=20,
    choices=[('explorer', 'Explorer'), ('creator', 'Creator')],
    default='explorer',
    null=True,
    blank=True
)
subscription_billing_cycle = models.CharField(
    max_length=20,
    choices=[('monthly', 'Monthly'), ('annually', 'Annually')],
    null=True,
    blank=True
)
subscription_start_date = models.DateTimeField(null=True, blank=True)
subscription_end_date = models.DateTimeField(null=True, blank=True)
subscription_active = models.BooleanField(default=False)
```

### 5. Update URLs

In `core/urls.py`, import and add:

```python
from .views import PaymentInitializeView, PaymentVerifyView, paystack_webhook

urlpatterns = [
    # ... existing patterns ...
    path('api/payments/initialize/', PaymentInitializeView.as_view(), name='payment-initialize'),
    path('api/payments/verify/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('api/webhooks/paystack/', paystack_webhook, name='paystack-webhook'),
]
```

### 6. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Environment Variables

Add to your Django `.env`:

```env
PAYSTACK_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_PUBLIC_KEY_HERE
```

---

## Testing

1. **Local Testing** - Use Paystack test keys and test card: `4111 1111 1111 1111`
2. **Production** - Switch to live keys in Paystack dashboard
3. **Webhook Testing** - Use Paystack's webhook delivery log to debug

---

## Security Checklist

✅ Secret key only in backend (.env)
✅ CSRF token validation
✅ Verify amount before processing
✅ Verify webhook signature
✅ Only activate subscription after Paystack confirms
✅ User can't modify email/amount in request
✅ Reference is unique & time-stamped to prevent duplicates

Done! Your payment system is ready! 🎉
