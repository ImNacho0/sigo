import { useEffect, useState } from 'react';
import { mockVulnerabilityData } from '../data/mockData';
import type { VulnerabilityData } from '../data/mockData';

interface ElasticsearchStats {
    [regionId: string]: {
        doc_count: number;
        leakSize: string;
        last_scan: string;
    };
}

export const useElasticsearchStats = () => {
    const [data, setData] = useState<VulnerabilityData[]>(mockVulnerabilityData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('license_key') || ''}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const stats: ElasticsearchStats = await response.json();

            // Update mockVulnerabilityData with real Elasticsearch counts
            const updatedData = mockVulnerabilityData.map(region => {
                const stat = stats[region.id];
                if (stat) {
                    return {
                        ...region,
                        docs: stat.doc_count,
                        leakSize: stat.leakSize || region.leakSize,
                        lastScan: stat.last_scan || region.lastScan
                    };
                }
                return region;
            });

            setData(updatedData);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching Elasticsearch stats:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
            // Fallback to mock data
            setData(mockVulnerabilityData);
        }
    };

    useEffect(() => {
        fetchStats();
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return { data, loading, error, refetch: fetchStats };
};
