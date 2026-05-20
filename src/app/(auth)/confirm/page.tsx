import { Suspense } from 'react';
import ConfirmEmailClient from './confirm-client';

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(180,35,24,0.18),transparent_22%),linear-gradient(180deg,#fff9f5_0%,#f7ebe1_100%)]" />}>
      <ConfirmEmailClient />
    </Suspense>
  );
}
