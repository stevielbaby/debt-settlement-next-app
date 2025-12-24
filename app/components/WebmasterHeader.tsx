'use client';

import React from 'react';
import WebmasterNotifications from './WebmasterNotifications';

export default function WebmasterHeader() {
  return (
    <div className="flex items-center gap-4">
      <WebmasterNotifications />
    </div>
  );
}
