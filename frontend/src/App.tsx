import React, { useState, useEffect } from 'react';
import israelLogo from './assets/branding/israel.png';
import Header from './components/Header';
import VulnerabilityMap from './components/VulnerabilityMap';
import StatisticsPanel from './components/StatisticsPanel';
import type { VulnerabilityData } from './data/mockData';

import LoadingScreen from './components/LoadingScreen';
import AboutModal from './components/AboutModal';
import { EnciclopediaModal } from './components/EnciclopediaModal';
import Login from './components/Login';
import LogoutModal from './components/LogoutModal';
import ProfileView from './components/ProfileView';
import { useElasticsearchStats } from './hooks/useElasticsearchStats';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [showAbout, setShowAbout] = useState(false);
  const [isClosingAbout, setIsClosingAbout] = useState(false);

  const [showEnciclopedia, setShowEnciclopedia] = useState(false);

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedRegionData, setSelectedRegionData] = useState<VulnerabilityData | null>(null);
  const [isClosingRegion, setIsClosingRegion] = useState(false);
  const [compareWithId, setCompareWithId] = useState<string>('');

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isClosingLogoutModal, setIsClosingLogoutModal] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [isClosingSettings, setIsClosingSettings] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [licenseName, setLicenseName] = useState<string>('');
  const [licenseRole, setLicenseRole] = useState<string>('user');
  const [licenseType, setLicenseType] = useState<string>('');
  const [profileData, setProfileData] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Real-time Elasticsearch stats
  const { data: vulnerabilityData, loading: statsLoading } = useElasticsearchStats();

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshProfileData = async () => {
    try {
      const response = await fetch('/auth/status');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setProfileData(data);
        setLicenseName(data.name || 'OPERATOR');
        setLicenseRole(data.role || 'user');
        setLicenseType(data.type || data.license_type || '');
      }
    } catch (err) {
      // Error silently handled
    } finally {
      setIsCheckingAuth(false);
    }
  };

  useEffect(() => {
    refreshProfileData();
  }, []);

  const handleLoginSuccess = (data: any) => {
    // Set loading to false directly to skip LoadingScreen after login
    setLoading(false);
    setIsAuthenticated(true);
    setProfileData(data);
    setLicenseName(data.name || 'OPERATOR');
    setLicenseRole(data.role || 'user');
    setLicenseType(data.type || data.license_type || '');
  };

  const handleLogout = async () => {
    setIsClosingLogoutModal(true);
    localStorage.removeItem('operator_key');
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error("Logout failed", e);
    }
    setTimeout(() => {
      setIsAuthenticated(false);
      setShowLogoutModal(false);
      setIsClosingLogoutModal(false);
      setShowSettings(false);
    }, 300);
  };

  const handleCloseLogoutModal = () => {
    setIsClosingLogoutModal(true);
    setTimeout(() => {
      setShowLogoutModal(false);
      setIsClosingLogoutModal(false);
    }, 300);
  };

  const handleCloseSettings = () => {
    setIsClosingSettings(true);
    setTimeout(() => {
      setShowSettings(false);
      setIsClosingSettings(false);
    }, 400);
  };

  const handleSelectRegion = (region: VulnerabilityData | null) => {
    if (!region && selectedRegionId) {
      setIsClosingRegion(true);
      setTimeout(() => {
        setSelectedRegionId(null);
        setSelectedRegionData(null);
        setCompareWithId('');
        setIsClosingRegion(false);
      }, 250);
    } else {
      setSelectedRegionId(region ? region.id : null);
      setSelectedRegionData(region);
      setCompareWithId('');
      setIsClosingRegion(false);
    }
  };

  const handleCloseAbout = () => {
    setIsClosingAbout(true);
    setTimeout(() => {
      setShowAbout(false);
      setIsClosingAbout(false);
    }, 250);
  };

  if (isCheckingAuth) {
    return <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #1a4731',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      {loading && <LoadingScreen onLoaded={() => setLoading(false)} />}

      {showAbout && <AboutModal isClosing={isClosingAbout} onClose={handleCloseAbout} />}

      {showEnciclopedia && <EnciclopediaModal onClose={() => setShowEnciclopedia(false)} />}


      {showSettings && (
        <ProfileView
          onBack={handleCloseSettings}
          profileData={profileData}
          licenseName={licenseName}
          licenseRole={licenseRole}
          licenseType={licenseType}
          isClosing={isClosingSettings}
        />
      )}

      <div className={`app-container ${loading ? 'hidden' : ''}`} style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.8s ease-in-out' }}>
        <Header
          onOpenAbout={() => setShowAbout(true)}
          onOpenEnciclopedia={() => setShowEnciclopedia(true)}
          onLogout={() => setShowLogoutModal(true)}
          onOpenSettings={() => {
            refreshProfileData();
            setShowSettings(true);
          }}
          licenseName={licenseName}
          licenseRole={licenseRole}
          selectedRegion={selectedRegionData}
          compareWithId={compareWithId}
          onCompareChange={setCompareWithId}
          data={vulnerabilityData}
        />


        {showLogoutModal && (
          <LogoutModal
            onConfirm={handleLogout}
            onClose={handleCloseLogoutModal}
            isClosing={isClosingLogoutModal}
          />
        )}

        <VulnerabilityMap
          key={statsLoading ? 'loading' : 'loaded'}
          data={vulnerabilityData}
          onSelectRegion={handleSelectRegion}
          selectedRegionId={selectedRegionId}
          compareWithId={compareWithId}
        />

        {selectedRegionData && (
          <StatisticsPanel
            key={`stats-panel-${selectedRegionData.id}`}
            region={selectedRegionData}
            isClosing={isClosingRegion}
            compareWithId={compareWithId}
            onClose={() => handleSelectRegion(null)}
            data={vulnerabilityData}
          />
        )}

        {!isMobile && (
          <div className="glass-panel" style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            padding: '12px 24px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontWeight: 700, opacity: 0.6 }}>RIESGO:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--vuln-critical)' }}></div> Crítico</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--vuln-high)' }}></div> Alto</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--vuln-medium)' }}></div> Medio</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--vuln-safe)' }}></div> Seguro</div>
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: isMobile ? '80px' : '24px',
          right: isMobile ? '12px' : '24px',
          zIndex: 900,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          pointerEvents: 'none',
          opacity: isMobile ? 0.3 : 0.4,
          filter: 'grayscale(1) contrast(0.8)',
          transition: 'all 0.3s'
        }}>
          <img src={israelLogo} alt="Mossad" style={{ height: isMobile ? '28px' : '36px', filter: 'brightness(1.5)' }} />
          {!isMobile && (
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right' }}>
              Operated by HaMossad
              <br />
              leModiʿin u-leTafkidim Meyuḥadim
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
