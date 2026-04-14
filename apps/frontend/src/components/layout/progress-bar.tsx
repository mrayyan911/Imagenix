'use client';

import { AppProgressBar } from 'next-nprogress-bar';

export function ProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="#3B82F6"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
