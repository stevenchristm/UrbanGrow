import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_URL } from '../constants/config';

interface SettingsContextType {
  settings: Record<string, string>;
  isLoadingSettings: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings`);
      if (response.data && response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.log('Error fetching settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoadingSettings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
