import React, { useState, useEffect } from 'react';
import { ApiResponse, HealthStatus } from '@instabuild/shared';

interface HealthComponentProps {
  apiUrl?: string;
}

export const Health: React.FC<HealthComponentProps> = ({
  apiUrl = 'http://localhost:3000',
}) => {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/health`);
        const data: ApiResponse<HealthStatus> = await response.json();

        if (data.success && data.data) {
          setHealthData(data.data);
          setError(null);
        } else {
          setError(data.error || 'Unknown error');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch health status'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="health-status loading">Checking health status...</div>
    );
  }

  if (error) {
    return (
      <div className="health-status error">
        <span className="status-indicator error">❌</span>
        <span>Health check failed: {error}</span>
      </div>
    );
  }

  return (
    <div className="health-status success">
      <span className="status-indicator success">✅</span>
      <span>
        Backend is {healthData?.status} (checked at {healthData?.timestamp})
      </span>
    </div>
  );
};
