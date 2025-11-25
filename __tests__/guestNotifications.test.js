/**
 * Guest Notification System - Integration Test File
 * 
 * Add this to your test suite to verify all components work together
 * Example using Jest + React Testing Library
 */

// __tests__/guestNotifications.test.js

import { renderHook, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGuestNotifications } from '@/hooks/useGuestNotifications'
import GuestNotificationBanner from '@/components/GuestNotificationBanner'
import GuestNotificationModal from '@/components/GuestNotificationModal'
import GuestNotificationContainer from '@/components/GuestNotificationContainer'

// Mock the API
global.fetch = jest.fn()

describe('Guest Notification System', () => {
  beforeEach(() => {
    fetch.mockClear()
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('useGuestNotifications hook', () => {
    it('should fetch guest notifications on mount', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 1
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest_notifications: [mockNotification],
          visit_count: 1,
          is_authenticated: false
        })
      })

      const { result } = renderHook(() => useGuestNotifications())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.notification).toEqual(mockNotification)
      expect(result.current.visitCount).toBe(1)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should not show notification if authenticated', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest_notifications: [],
          visit_count: 1,
          is_authenticated: true
        })
      })

      const { result } = renderHook(() => useGuestNotifications())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.notification).toBeNull()
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useGuestNotifications())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.notification).toBeNull()
    })

    it('should dismiss notification and not show again in session', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 1
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest_notifications: [mockNotification],
          visit_count: 1,
          is_authenticated: false
        })
      })

      const { result } = renderHook(() => useGuestNotifications())

      await waitFor(() => {
        expect(result.current.notification).not.toBeNull()
      })

      // Dismiss notification
      result.current.dismissNotification(mockNotification.id)

      await waitFor(() => {
        expect(result.current.notification).toBeNull()
      })

      // Check sessionStorage
      const dismissed = JSON.parse(
        sessionStorage.getItem('dismissedGuestNotifications') || '[]'
      )
      expect(dismissed).toContain(mockNotification.id)
    })
  })

  describe('GuestNotificationBanner component', () => {
    it('should render banner with notification content', () => {
      const notification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 1
      }

      const { getByText, getByRole } = render(
        <GuestNotificationBanner
          notification={notification}
          onDismiss={jest.fn()}
          onCTA={jest.fn()}
          visitCount={1}
        />
      )

      expect(getByText('Welcome!')).toBeInTheDocument()
      expect(getByText('Start sharing')).toBeInTheDocument()
      expect(getByRole('button', { name: /get started/i })).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss button clicked', async () => {
      const handleDismiss = jest.fn()
      const notification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 1
      }

      const user = userEvent.setup()
      const { getByLabelText } = render(
        <GuestNotificationBanner
          notification={notification}
          onDismiss={handleDismiss}
          onCTA={jest.fn()}
          visitCount={1}
        />
      )

      await user.click(getByLabelText(/dismiss notification/i))

      await waitFor(() => {
        expect(handleDismiss).toHaveBeenCalled()
      })
    })

    it('should not show dismiss button if dismiss_count is 0', () => {
      const notification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 0
      }

      const { queryByLabelText } = render(
        <GuestNotificationBanner
          notification={notification}
          onDismiss={jest.fn()}
          onCTA={jest.fn()}
          visitCount={1}
        />
      )

      expect(queryByLabelText(/dismiss notification/i)).not.toBeInTheDocument()
    })

    it('should apply correct color class based on priority', () => {
      const notification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 1,
        dismiss_count: 1
      }

      const { container } = render(
        <GuestNotificationBanner
          notification={notification}
          onDismiss={jest.fn()}
          onCTA={jest.fn()}
          visitCount={1}
        />
      )

      const banner = container.querySelector('.from-red-500')
      expect(banner).toBeInTheDocument()
    })
  })

  describe('GuestNotificationModal component', () => {
    it('should not render if priority is not 1', () => {
      const notification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 1
      }

      const { container } = render(
        <GuestNotificationModal
          notification={notification}
          onClose={jest.fn()}
          onCTA={jest.fn()}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render modal if priority is 1', () => {
      const notification = {
        id: 'notif-1',
        type: 'GUEST_ALERT',
        title: 'Important!',
        message: 'This is important',
        cta: 'Read More',
        cta_url: '/alert',
        emoji: '🔔',
        priority: 1,
        dismiss_count: 0
      }

      const { getByText } = render(
        <GuestNotificationModal
          notification={notification}
          onClose={jest.fn()}
          onCTA={jest.fn()}
        />
      )

      expect(getByText('Important!')).toBeInTheDocument()
      expect(getByText('This is important')).toBeInTheDocument()
    })

    it('should call onClose when close button clicked', async () => {
      const handleClose = jest.fn()
      const notification = {
        id: 'notif-1',
        type: 'GUEST_ALERT',
        title: 'Important!',
        message: 'This is important',
        cta: 'Read More',
        cta_url: '/alert',
        emoji: '🔔',
        priority: 1,
        dismiss_count: 0
      }

      const user = userEvent.setup()
      const { getByLabelText } = render(
        <GuestNotificationModal
          notification={notification}
          onClose={handleClose}
          onCTA={jest.fn()}
        />
      )

      await user.click(getByLabelText(/close notification/i))

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalled()
      })
    })
  })

  describe('GuestNotificationContainer', () => {
    it('should render banner for priority 2', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'GUEST_WELCOME',
        title: 'Welcome!',
        message: 'Start sharing',
        cta: 'Get Started',
        cta_url: '/signup',
        emoji: '🎉',
        priority: 2,
        dismiss_count: 1
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest_notifications: [mockNotification],
          visit_count: 1,
          is_authenticated: false
        })
      })

      const { getByText } = render(<GuestNotificationContainer />)

      await waitFor(() => {
        expect(getByText('Welcome!')).toBeInTheDocument()
      })
    })

    it('should render modal for priority 1', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'GUEST_ALERT',
        title: 'Important!',
        message: 'This is important',
        cta: 'Read More',
        cta_url: '/alert',
        emoji: '🔔',
        priority: 1,
        dismiss_count: 0
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest_notifications: [mockNotification],
          visit_count: 15,
          is_authenticated: false
        })
      })

      const { getByText } = render(<GuestNotificationContainer />)

      await waitFor(() => {
        expect(getByText('Important!')).toBeInTheDocument()
      })
    })

    it('should not render for authenticated users', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          guest_notifications: [],
          visit_count: 1,
          is_authenticated: true
        })
      })

      const { container } = render(<GuestNotificationContainer />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })
})
