/**
 * Toast utility — thin re-export of react-hot-toast with CyberShield presets.
 *
 * Usage:
 *   import { toastSuccess, toastError, toastInfo } from '../components/ui/Toast';
 *   toastSuccess('Alert resolved');
 *   toastError('Failed to load data');
 */
import toast from 'react-hot-toast';

export const toastSuccess = (msg) => toast.success(msg);
export const toastError   = (msg) => toast.error(msg);
export const toastInfo    = (msg) =>
  toast(msg, {
    icon: 'ℹ',
    style: {
      background: '#0d1424',
      color: '#e2e8f0',
      border: '1px solid #1e2d45',
    },
  });

export default toast;
