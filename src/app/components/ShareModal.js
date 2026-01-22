'use client'

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const ShareModal = ({ isOpen, onClose, shareData, imageUrl, isVerse }) => {
  const modalRef = useRef(null);
  const [webShareSupported, setWebShareSupported] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    // Check if Web Share API is supported
    setWebShareSupported(navigator.share !== undefined);
  }, []);

  // Reset copied state when the shared URL or title changes
  useEffect(() => {
    setCopied(false);
  }, [shareData?.url, shareData?.title]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);
  
  const handleNativeShare = async () => {
    try {
      const dataToShare = {
        title: shareData.title || 'StoryVermo',
        text: shareData.description || 'Check out StoryVermo',
        url: shareData.url || (typeof window !== 'undefined' ? window.location.origin : ''),
      };
      
      if (navigator.share) {
        await navigator.share(dataToShare);
        onClose();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('Failed to share. Please try again.');
      }
    }
  };
  
  const handleCopyLink = async () => {
    try {
      const url = shareData.url || (typeof window !== 'undefined' ? window.location.origin : '');
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          alert('Unable to copy link. Please copy manually.');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      alert('Failed to copy link. Please try again.');
    }
  };
  
  const handleSocialShare = (platform) => {
    const url = shareData.url || (typeof window !== 'undefined' ? window.location.origin : '');
    const title = shareData.title || 'StoryVermo';
    const text = shareData.description || 'Check out StoryVermo';
    
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(text);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'reddit':
        shareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
        break;
      case 'pinterest':
        // Pinterest specifically allows image parameter
        const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : '';
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}${encodedImage ? `&media=${encodedImage}` : ''}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedText}%20${encodedUrl}`;
        break;
      case 'instagram':
        // Instagram doesn't allow direct URL sharing, so we'll copy the link to clipboard
        handleCopyLink();
        alert('Link copied! You can now paste it in your Instagram story or post.');
        return;
      case 'tiktok':
        // TikTok doesn't have a direct share URL, so we'll copy the link
        handleCopyLink();
        alert('Link copied! You can now paste it in your TikTok video description.');
        return;
      case 'discord':
        // Discord doesn't have a direct share URL, so we'll copy the link
        handleCopyLink();
        alert('Link copied! You can now paste it in your Discord messages.');
        return;
      case 'snapchat':
        // Snapchat doesn't have a direct share URL, so we'll copy the link
        handleCopyLink();
        alert('Link copied! You can now paste it in your Snapchat messages.');
        return;
      default:
        return;
    }
    
    // Open in new window for better UX
    const newWindow = window.open(shareUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) newWindow.opener = null;
    
    // Close modal after sharing
    setTimeout(() => onClose(), 300);
  };
  
  const socialPlatforms = [
    { name: 'Instagram', key: 'instagram', color: '#E4405F', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
      </svg>
    ) },
    { name: 'Facebook', key: 'facebook', color: '#1877F2', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ) },
    { name: 'Twitter', key: 'twitter', color: '#1DA1F2', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
      </svg>
    ) },
    { name: 'TikTok', key: 'tiktok', color: '#000000', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.95-.55-.25-1.06-.59-1.56-.95-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ) },
    { name: 'LinkedIn', key: 'linkedin', color: '#0A66C2', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ) },
    { name: 'WhatsApp', key: 'whatsapp', color: '#25D366', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ) },
    { name: 'Telegram', key: 'telegram', color: '#0088CC', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
      </svg>
    ) },
    { name: 'Reddit', key: 'reddit', color: '#FF4500', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M14.238 15.348c.082.082.182.147.298.192.115.045.238.068.363.068s.248-.023.363-.068c.115-.045.216-.11.298-.192l.707-.707c.082-.082.147-.182.192-.298.045-.115.068-.238.068-.363s-.023-.248-.068-.363c-.045-.115-.11-.216-.192-.298-.082-.082-.182-.147-.298-.192-.115-.045-.238-.068-.363-.068s-.248.023-.363.068c-.115.045-.216.11-.298.192l-.707.707c-.082.082-.147.182-.192.298-.045.115-.068.238-.068.363s.023.248.068.363c.045.115.11.216.192.298zm-4.476 0c.082.082.182.147.298.192.115.045.238.068.363.068s.248-.023.363-.068c.115-.045.216-.11.298-.192l.707-.707c.082-.082.147-.182.192-.298.045-.115.068-.238.068-.363s-.023-.248-.068-.363c-.045-.115-.11-.216-.192-.298-.082-.082-.182-.147-.298-.192-.115-.045-.238-.068-.363-.068s-.248.023-.363.068c-.115.045-.216.11-.298.192l-.707.707c-.082.082-.147.182-.192.298-.045.115-.068.238-.068.363s.023.248.068.363c.045.115.11.216.192.298zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.066 9.645c.183 0 .36.036.527.107.167.071.316.175.439.305.123.13.22.284.285.455.065.171.098.353.098.538 0 .185-.033.367-.098.538-.065.171-.162.325-.285.455-.123.13-.272.234-.439.305-.167.071-.344.107-.527.107-.183 0-.36-.036-.527-.107-.167-.071-.316-.175-.439-.305-.123-.13-.22-.284-.285-.455-.065-.171-.098-.353-.098-.538 0-.185.033-.367.098-.538.065-.171.162-.325.285-.455.123-.13.272-.234.439-.305.167-.071.344-.107.527-.107zM12 16c-1.896 0-3.685-.875-4.842-2.368-.157-.202-.237-.45-.237-.702 0-.252.08-.5.237-.702.157-.202.37-.359.608-.452.238-.093.495-.118.744-.072.249.046.477.16.656.328.179.168.301.385.351.621.05.236.025.481-.07.702-.095.221-.26.405-.47.532-.21.127-.455.191-.704.191-.249 0-.494-.064-.704-.191-.21-.127-.375-.311-.47-.532-.095-.221-.12-.466-.07-.702.05-.236.172-.453.351-.621.179-.168.407-.282.656-.328.249-.046.506-.021.744.072.238.093.451.25.608.452.157.202.237.45.237.702 0 .252-.08.5-.237.702C15.685 15.125 13.896 16 12 16zm6.066-4.355c-.183 0-.36-.036-.527-.107-.167-.071-.316-.175-.439-.305-.123-.13-.22-.284-.285-.455-.065-.171-.098-.353-.098-.538 0-.185.033-.367.098-.538.065-.171.162-.325.285-.455.123-.13.272-.234.439-.305.167-.071.344-.107.527-.107.183 0 .36.036.527.107.167.071.316.175.439.305.123.13.22.284.285.455.065.171.098.353.098.538 0 .185-.033.367-.098.538-.065.171-.162.325-.285.455-.123.13-.272.234-.439.305-.167.071-.344.107-.527.107z"/>
      </svg>
    ) },
    { name: 'Pinterest', key: 'pinterest', color: '#BD081C', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.219-5.175 1.219-5.175s-.311-.623-.311-1.543c0-1.446.839-2.526 1.885-2.526.888 0 1.318.666 1.318 1.466 0 .893-.568 2.229-.861 3.467-.245 1.04.52 1.888 1.546 1.888 1.856 0 3.283-1.958 3.283-4.789 0-2.503-1.799-4.253-4.37-4.253-2.977 0-4.727 2.234-4.727 4.546 0 .9.347 1.863.781 2.387.085.104.098.195.072.301-.079.329-.254 1.037-.289 1.183-.047.196-.153.238-.353.144-1.314-.612-2.137-2.536-2.137-4.078 0-3.298 2.394-6.325 6.901-6.325 3.628 0 6.44 2.586 6.44 6.043 0 3.607-2.274 6.505-5.431 6.505-1.06 0-2.057-.552-2.396-1.209 0 0-.523 1.992-.65 2.479-.235.9-.871 2.028-1.297 2.717.976.301 2.018.461 3.096.461 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
      </svg>
    ) },
    { name: 'Snapchat', key: 'snapchat', color: '#FFFC00', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12.053 7.531c-1.413 0-2.563-1.15-2.563-2.563s1.15-2.563 2.563-2.563 2.563 1.15 2.563 2.563-1.15 2.563-2.563 2.563zm8.947 8.798c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141zm-1.406-1.406c-.047-.03-.094-.047-.141-.047-.047 0-.094.016-.141.047-.047.03-.078.078-.094.141-.016.063-.016.125 0 .188.016.063.047.109.094.141.047.03.094.047.141.047.047 0 .094-.016.141-.047.047-.03.078-.078.094-.141.016-.063.016-.125 0-.188-.016-.063-.047-.109-.094-.141z"/>
      </svg>
    ) },
    { name: 'Email', key: 'email', color: '#EA4335', svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
    ) },
  ];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[10102] flex items-center justify-center p-4">
      <div 
        ref={modalRef} 
        className="bg-gradient-to-br from-gray-900 to-black border border-neon-blue/30 rounded-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-95 animate-scaleIn"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-transparent bg-gradient-to-r from-transparent via-blue-900/30 to-transparent">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-orbitron flex items-center gap-2">
              <span className="inline-block w-6 h-6">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </span>
              SHARE {isVerse ? 'VERSE' : 'STORY'}
            </h2>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex items-center justify-center transition-all hover:from-blue-700/50 hover:to-purple-700/50 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-500/20"
            >
              <span className="inline-block w-5 h-5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* Combined Image and Text Preview */}
          <div className="mb-6 flex gap-4">
            {/* Image Preview - Left Side */}
            {imageUrl && (
              <div className="flex-shrink-0">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-blue-500/30 shadow-lg shadow-blue-500/10">
                  {/* FIXED: Using Next.js Image for optimization */}
                  <Image
                    src={imageUrl}
                    alt={isVerse ? 'Verse preview' : 'Story preview'}
                    fill
                    className="object-cover"
                    quality={75}
                  />
                </div>
              </div>
            )}
            
            {/* Story/Verse Preview - Right Side */}
            <div className="flex-grow">
              <h4 className="text-white font-semibold mb-2 line-clamp-1 text-lg">
                {shareData.title || 'StoryVermo'}
              </h4>
              <p className="text-gray-400 text-sm line-clamp-2">
                {shareData.description || 'Check out this story on StoryVermo'}
              </p>
            </div>
          </div>
          
          {/* Link Preview */}
          <div className="bg-gradient-to-b from-gray-800 to-black border border-blue-900/50 rounded-xl p-4 mb-6">
            <p className="text-blue-300 text-xs mb-1 uppercase tracking-wider">Share Link</p>
            <p className="text-white text-sm truncate">
              {shareData.url || (typeof window !== 'undefined' ? window.location.origin : '')}
            </p>
          </div>
          
          {/* Native Share Button (if supported) */}
          {webShareSupported && (
            <div className="mb-6">
              <button
                onClick={handleNativeShare}
                className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.02] hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                <span className="inline-block w-5 h-5 group-hover:translate-x-1 transition-transform">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                  </svg>
                </span>
                <span>Share to Device Apps</span>
              </button>
              <p className="text-gray-500 text-xs text-center mt-2">
                Your device will show all available sharing options
              </p>
            </div>
          )}
          
          {/* Copy Link Button */}
          <div className="mb-6">
            <button
              onClick={handleCopyLink}
              className={`w-full py-4 px-8 rounded-xl ${copied ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'} text-white font-bold text-lg uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-3 group border ${copied ? 'border-green-500/50' : 'border-blue-500/30'}`}
            >
              {copied ? (
                <span className="inline-block w-5 h-5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                  </svg>
                </span>
              ) : (
                <span className="inline-block w-5 h-5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                </span>
              )}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
          
          {/* Divider */}
          {webShareSupported && (
            <div className="flex items-center mb-6">
              <div className="flex-1 border-t border-blue-900/30"></div>
              <span className="px-3 text-gray-500 text-sm">or share directly</span>
              <div className="flex-1 border-t border-blue-900/30"></div>
            </div>
          )}
          
          {/* Social Platform Grid */}
          <div className="space-y-3">
            <p className="text-blue-300 text-sm font-medium text-center uppercase tracking-wider">Share on social platforms:</p>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-4 gap-3 pr-2">
                {socialPlatforms.map((platform) => {
                  return (
                    <button
                      key={platform.key}
                      onClick={() => handleSocialShare(platform.key)}
                      className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-800 to-black rounded-xl transition-all duration-300 group transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 border border-blue-900/50"
                    >
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-lg"
                        style={{ backgroundColor: platform.color }}
                      >
                        {platform.svg}
                      </div>
                      <span className="text-white text-xs font-medium text-center group-hover:text-gray-100 leading-tight">
                        {platform.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Footer Message */}
          <div className="mt-6 text-center border-t border-blue-900/30 pt-4">
            <p className="text-gray-500 text-xs">
              Help us grow the StoryVermo community!
            </p>
            {imageUrl && (
              <p className="text-gray-600 text-xs mt-1">
                Image will be included when sharing to supported platforms
              </p>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70"></div>
      </div>
    </div>
  );
};

export default ShareModal;