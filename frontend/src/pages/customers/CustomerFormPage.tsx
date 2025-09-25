// frontend/src/pages/customers/CustomerFormPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ChannelType, ChannelSubtype, ContactChannelFormData } from '../../types/contact.types';
import { 
  useCustomer, 
  useCreateCustomer, 
  useUpdateCustomer 
} from '../../hooks/useCustomers';
import { CustomerFormData } from '../../types/customer.types';
import CustomerForm from '../../components/customers/CustomerForm';
import toastService from '../../services/toast.service';

const CustomerFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Determine if we're in edit mode
  const isEditMode = Boolean(id && id !== 'new');
  const customerId = isEditMode ? parseInt(id!) : null;

  // State for form initialization
  const [initialData, setInitialData] = useState<Partial<CustomerFormData>>({});
  const [isFormReady, setIsFormReady] = useState(!isEditMode); // Ready immediately for create mode

  // Hooks
  const { data: customer, isLoading: loadingCustomer, error: customerError } = useCustomer(
    isEditMode && customerId ? customerId : 0
  );
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  // Transform customer data for form when in edit mode
  useEffect(() => {
    if (isEditMode && customer) {
      console.log('Customer PAN from backend:', customer.pan); 
      console.log('IWell from backend:', customer.iwell_code);
      
      // Map backend channels to ContactChannelFormData type
      const mappedChannels: ContactChannelFormData[] = customer.channels?.map(ch => ({
        id: ch.id,
        _temp_id: undefined,
        channel_type: ch.channel_type as ChannelType,
        channel_value: ch.channel_value,
        channel_subtype: (ch.channel_subtype || 'personal') as ChannelSubtype,
        is_primary: ch.is_primary || false
      })) || [];
      
      const formData: Partial<CustomerFormData> = {
        // Contact fields
        prefix: customer.prefix,
        name: customer.name,
        channels: mappedChannels,
        
        // Customer fields (handle masked PAN in edit mode)
        pan: customer.pan && !customer.pan.includes('x') ? customer.pan : '',
        iwell_code: customer.iwell_code || '',
        date_of_birth: customer.date_of_birth || '',
        anniversary_date: customer.anniversary_date || '',
        family_head_name: customer.family_head_name || '',
        family_head_iwell_code: customer.family_head_iwell_code || '',
        referred_by_name: customer.referred_by_name || '',
        survival_status: customer.survival_status,
        date_of_death: customer.date_of_death || '',
        onboarding_status: customer.onboarding_status,
        addresses: customer.addresses || []
      };

      setInitialData(formData);
      setIsFormReady(true);
    }
  }, [customer, isEditMode]);

  // Handle form submission
  const handleSubmit = async (formData: CustomerFormData) => {
    try {
      if (isEditMode && customerId) {
        // Update existing customer
        const updateData = {
          prefix: formData.prefix,
          name: formData.name,
          pan: formData.pan || undefined,
          iwell_code: formData.iwell_code || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          anniversary_date: formData.anniversary_date || undefined,
          survival_status: formData.survival_status,
          date_of_death: formData.date_of_death || undefined,
          family_head_name: formData.family_head_name || undefined,
          family_head_iwell_code: formData.family_head_iwell_code || undefined,
          onboarding_status: formData.onboarding_status
        };

        await updateCustomerMutation.mutateAsync({
          id: customerId,
          data: updateData
        });

        toastService.success('Customer updated successfully');
        navigate(`/customers/${customerId}`);
      } else {
        // Create new customer
        const createData = {
          prefix: formData.prefix,
          name: formData.name,
          channels: formData.channels.map(ch => ({
            channel_type: ch.channel_type,
            channel_value: ch.channel_value,
            channel_subtype: ch.channel_subtype || 'personal',
            is_primary: ch.is_primary || false
          })),
          pan: formData.pan || undefined,
          iwell_code: formData.iwell_code || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          anniversary_date: formData.anniversary_date || undefined,
          family_head_name: formData.family_head_name || undefined,
          family_head_iwell_code: formData.family_head_iwell_code || undefined,
          referred_by_name: formData.referred_by_name || undefined,
          address: formData.addresses.length > 0 ? {
            address_type: formData.addresses[0].address_type,
            address_line1: formData.addresses[0].address_line1,
            address_line2: formData.addresses[0].address_line2 || undefined,
            city: formData.addresses[0].city,
            state: formData.addresses[0].state,
            country: formData.addresses[0].country,
            pincode: formData.addresses[0].pincode,
            is_primary: formData.addresses[0].is_primary,
            is_active: formData.addresses[0].is_active
          } : undefined
        };

        const newCustomer = await createCustomerMutation.mutateAsync(createData);
        toastService.success('Customer created successfully');
        navigate(`/customers/${newCustomer.id}`);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toastService.error(
        isEditMode ? 'Failed to update customer' : 'Failed to create customer'
      );
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isEditMode && customerId) {
      navigate(`/customers/${customerId}`);
    } else {
      navigate('/customers');
    }
  };

  // Loading state for edit mode
  if (isEditMode && loadingCustomer) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${colors.brand.primary}20`,
            borderTop: `3px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Loading Customer
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Retrieving customer information...
          </p>
        </div>
      </div>
    );
  }

  // Error state for edit mode
  if (isEditMode && customerError) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: colors.semantic.error + '20',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.semantic.error} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Customer Not Found
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '20px'
          }}>
            The customer you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/customers')}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  // Don't render form until we have initial data for edit mode
  if (!isFormReady) {
    return null;
  }

  const pageTitle = isEditMode 
    ? `Edit ${customer?.name || 'Customer'}` 
    : 'Create New Customer';

  const isLoading = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          color: colors.utility.secondaryText
        }}>
          <button
            onClick={() => navigate('/customers')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.brand.primary,
              cursor: 'pointer',
              padding: 0,
              fontSize: '14px'
            }}
          >
            Customers
          </button>
          <span>/</span>
          {isEditMode && customer && (
            <>
              <button
                onClick={() => navigate(`/customers/${customerId}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.brand.primary,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '14px'
                }}
              >
                {customer.name}
              </button>
              <span>/</span>
            </>
          )}
          <span style={{ color: colors.utility.primaryText }}>
            {isEditMode ? 'Edit' : 'New Customer'}
          </span>
        </div>

        {/* Form */}
        <CustomerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isLoading}
          mode={isEditMode ? 'edit' : 'create'}
          title={pageTitle}
        />
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CustomerFormPage;