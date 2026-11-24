import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends (Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-3xl m-4 dir-rtl text-stone-900 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-red-900">
                {this.props.fallbackTitle || 'حدث تنبيه أثناء عرض هذه الواجهة'}
              </h3>
              <p className="text-xs text-red-700 font-medium">
                تم احتواء التنبيه بأمان لمنع إغلاق لوحة التحكم أو الخروج من الصفحة
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="bg-white/90 border border-red-200 rounded-2xl p-3 text-xs font-mono text-red-800 break-all leading-relaxed max-h-36 overflow-y-auto" dir="ltr">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة تحميل الواجهة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                this.handleReset();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('app:route-change'));
                }
              }}
              className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للأقسام الرئيسية</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
