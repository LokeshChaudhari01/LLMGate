"use client";

import { useState } from "react";
import { useKeys, useTenants } from "@/lib/hooks/use-dashboard-data";

export function KeyManager() {
  const { data: keys, mutate: mutateKeys, isLoading: keysLoading } = useKeys();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  
  const [tenantId, setTenantId] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !description) return;

    setCreating(true);
    setNewKey(null);
    setError("");
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create API key");
      setNewKey(data.rawKey);
      setCopied(false);
      setDescription("");
      await mutateKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError("");
    try {
      const response = await fetch("/api/admin/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not revoke API key");
      }
      setConfirmingId(null);
      await mutateKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke API key");
    }
  };

  if (keysLoading || tenantsLoading) {
    return <div className="animate-pulse h-64 bg-zinc-900 rounded-xl"></div>;
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
      {(!Array.isArray(keys) || !Array.isArray(tenants)) && !error && <p role="alert" className="text-sm text-red-200">Could not load keys or tenants. Refresh the page to retry.</p>}
      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-6 rounded-xl">
          <h3 className="text-lg font-medium mb-2">API Key Created Successfully</h3>
          <p className="mb-4">Copy this key now. You won&apos;t be able to see it again.</p>
          <div className="bg-zinc-950 p-4 rounded-lg font-mono text-sm break-all select-all">
            {newKey}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={async () => { try { await navigator.clipboard.writeText(newKey); setCopied(true); } catch { setError("Copy failed. Select and copy the key above."); } }} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">{copied ? "Copied" : "Copy key"}</button>
            <button onClick={() => setNewKey(null)} className="px-4 py-2 text-emerald-200 hover:text-white">Dismiss</button>
          </div>
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-zinc-100 mb-4">Create New API Key</h3>
        <form onSubmit={handleCreate} noValidate className="flex flex-col gap-4 sm:flex-row">
          <select
            aria-label="Tenant"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-48 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-100"
          >
            <option value="">Select Tenant...</option>
            {tenants?.filter((t) => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="text"
            aria-label="API key description"
            placeholder="Key Description (e.g. Production Web App)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-100"
          />
          <button
            type="submit"
            disabled={creating || !tenantId || !description}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Generating..." : "Generate Key"}
          </button>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100">API Keys</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
              <tr>
                <th className="px-6 py-3">Tenant</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Key Hash (Truncated)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys?.map((k) => (
                <tr key={k.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-200">{k.tenantName}</td>
                  <td className="px-6 py-4">{k.description}</td>
                  <td className="px-6 py-4 font-mono text-xs">{k.keyHash.substring(0, 12)}...</td>
                  <td className="px-6 py-4">
                    {k.isActive ? (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">Revoked</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {k.isActive && (confirmingId === k.id ? (
                      <span className="flex items-center gap-2 text-xs text-amber-200">
                        Stops this key.
                        <button autoFocus onClick={() => setConfirmingId(null)} className="text-zinc-200 hover:text-white">Cancel</button>
                        <button onClick={() => handleRevoke(k.id)} className="text-red-300 hover:text-red-200">Confirm revoke</button>
                      </span>
                    ) : <button onClick={() => setConfirmingId(k.id)} className="text-orange-400 hover:text-orange-300 font-medium">Revoke</button>)}
                  </td>
                </tr>
              ))}
              {Array.isArray(keys) && keys.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-400">No API keys yet. Select an active tenant and generate one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
