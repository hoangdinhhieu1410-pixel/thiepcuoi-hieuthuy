import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL REACT APP ERROR:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('WeddingCardsIndexedDB_v1');
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-stone-800 rounded-3xl p-6 border border-stone-700 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">Đã xảy ra sự cố khi tải thiệp cưới</h2>
            <p className="text-xs text-stone-300">
              {this.state.error?.message || 'Có lỗi phát sinh trong bộ nhớ dữ liệu hoặc trình duyệt.'}
            </p>
            {this.state.error?.stack && (
              <pre className="text-[10px] text-rose-300 bg-stone-950 p-3 rounded-xl overflow-x-auto text-left max-h-36 font-mono">
                {this.state.error.stack}
              </pre>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
              >
                🔄 Tải Lại Trang (Reload)
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-semibold text-xs transition-all cursor-pointer"
              >
                Khôi phục dữ liệu gốc về mặc định
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
