// frontend/src/components/assets/CustomerAssetManager.tsx
// Component to manage customer asset assignments (Release 1.1 - Phase 1)

import React, { useState } from 'react';
import { Package, Plus, X, Loader } from 'lucide-react';
import { useAssetTypes, useCustomerAssets } from '../../hooks/useAssetTypes';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface CustomerAssetManagerProps {
  customerId: number;
}

export const CustomerAssetManager: React.FC<CustomerAssetManagerProps> = ({ customerId }) => {
  const { assetTypes, loading: loadingTypes } = useAssetTypes();
  const { assignments, loading: loadingAssignments, assignAssets, removeAsset } = useCustomerAssets(customerId);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const assignedAssetIds = assignments.map(a => a.asset_type_id);
  const availableAssets = assetTypes.filter(at => !assignedAssetIds.includes(at.id));

  const handleAssign = async () => {
    if (selectedAssets.length === 0) return;

    try {
      setIsAssigning(true);
      await assignAssets(selectedAssets);
      setSelectedAssets([]);
      setShowSelector(false);
    } catch (error) {
      console.error('Failed to assign assets:', error);
      alert('Failed to assign assets. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (assetTypeId: number) => {
    try {
      await removeAsset(assetTypeId);
      setConfirmRemove(null);
    } catch (error) {
      console.error('Failed to remove asset:', error);
      alert('Failed to remove asset. Please try again.');
    }
  };

  const toggleAssetSelection = (assetTypeId: number) => {
    setSelectedAssets(prev =>
      prev.includes(assetTypeId)
        ? prev.filter(id => id !== assetTypeId)
        : [...prev, assetTypeId]
    );
  };

  if (loadingTypes || loadingAssignments) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading assets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Asset Types</h3>
          <span className="text-sm text-gray-500">({assignments.length} assigned)</span>
        </div>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Assets</span>
        </button>
      </div>

      {/* Asset Selector (if open) */}
      {showSelector && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Select Assets to Assign</h4>
            <button onClick={() => setShowSelector(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {availableAssets.length === 0 ? (
            <p className="text-sm text-gray-600">All assets are already assigned.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableAssets.map(asset => (
                  <label
                    key={asset.id}
                    className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer transition ${
                      selectedAssets.includes(asset.id)
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={() => toggleAssetSelection(asset.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{asset.asset_type_name}</div>
                      <div className="text-xs text-gray-500">{asset.category}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowSelector(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={selectedAssets.length === 0 || isAssigning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isAssigning && <Loader className="w-4 h-4 animate-spin" />}
                  <span>Assign {selectedAssets.length > 0 && `(${selectedAssets.length})`}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Assigned Assets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No assets assigned yet.</p>
            <p className="text-sm">Click "Assign Assets" to get started.</p>
          </div>
        ) : (
          assignments.map(assignment => (
            <div
              key={assignment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {assignment.asset_type?.asset_type_code}
                    </span>
                    <h4 className="font-semibold text-gray-900">
                      {assignment.asset_type?.asset_type_name}
                    </h4>
                  </div>

                  {assignment.asset_type?.category && (
                    <p className="text-sm text-gray-600 mt-1">
                      {assignment.asset_type.category}
                    </p>
                  )}

                  {assignment.asset_type?.default_assumption_rate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Expected growth: {assignment.asset_type.default_assumption_rate}% / year
                    </p>
                  )}

                  {assignment.notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">
                      Note: {assignment.notes}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => setConfirmRemove(assignment.asset_type_id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove asset"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove !== null && handleRemove(confirmRemove)}
        title="Remove Asset Assignment"
        description="Are you sure you want to remove this asset assignment? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};
