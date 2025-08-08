import React from 'react';
import Link from 'next/link';

export default function MastersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Masters Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/Masters/users" className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <p className="text-gray-600">Manage system users</p>
        </Link>

        <Link href="/Masters/roles" className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Roles</h2>
          <p className="text-gray-600">Configure user roles and permissions</p>
        </Link>

        <Link href="/Masters/settings" className="p-6 bg-white shadow-sm rounded-lg hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-gray-600">System settings and configurations</p>
        </Link>
      </div>
    </div>
  );
}
