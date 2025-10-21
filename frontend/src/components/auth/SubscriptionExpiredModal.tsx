// frontend/src/components/auth/SubscriptionExpiredModal.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionEndDate: string;
  businessName: string;
}

/**
 * Subscription Expired Modal
 * 
 * Displays a warning when user's subscription has expired.
 * Shows on login if subscription end date has passed.
 */
const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  subscriptionEndDate,
  businessName
}) => {
  
  // Format the date to human-readable format
  const formattedDate = new Date(subscriptionEndDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate days since expiry
  const daysSinceExpiry = Math.floor(
    (new Date().getTime() - new Date(subscriptionEndDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const expiryMessage = daysSinceExpiry === 0 
    ? `Your subscription for ${businessName} expired today (${formattedDate}).`
    : daysSinceExpiry === 1
    ? `Your subscription for ${businessName} expired yesterday (${formattedDate}).`
    : `Your subscription for ${businessName} expired ${daysSinceExpiry} days ago on ${formattedDate}.`;

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onClose}
      title="Subscription Expired"
      description={`${expiryMessage} Please contact support to renew your subscription and continue using all features.`}
      confirmText="I Understand"
      cancelText="" // No cancel button
      type="warning"
      icon={<AlertTriangle className="w-6 h-6" />}
    />
  );
};

export default SubscriptionExpiredModal;