import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast, { ToastProps } from './Toast';

interface ToastContextType {
  showToast: (options: Omit<ToastProps, 'visible' | 'onHide'>) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<(ToastProps & { id: string }) | null>(null);

  const showToast = useCallback((options: Omit<ToastProps, 'visible' | 'onHide'>) => {
    const id = Date.now().toString();
    setToast({
      ...options,
      id,
      visible: true,
      onHide: () => setToast(null),
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, visible: false } : null));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      <View style={styles.container}>
        {children}
        {toast && (
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            visible={toast.visible}
            onHide={toast.onHide}
          />
        )}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
