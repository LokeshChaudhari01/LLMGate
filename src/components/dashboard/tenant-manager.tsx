"use client";

import { useState } from "react";
import { useTenants } from "@/lib/hooks/use-dashboard-data";

export function TenantManager() {
  const { data: tenants, mutate, isLoading } = useTenants();
  const [name, setName] = useState("");
  const [budgetUsd, setBudgetUsd] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedBudget, setEditedBudget] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !budgetUsd) return;

    setIsCreating(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, budgetUsd }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not create tenant");
      }
      setName("");
      setBudgetUsd("");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tenant");
    } finally {
      setIsCreating(false);
    }
  };

  const updateTenant = async (id: string, changes: { budgetUsd?: string; isActive?: boolean }) => {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not update tenant");
      }
      setConfirmingId(null);
      setEditingId(null);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update tenant");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-zinc-900 rounded-xl"></div>;
  }

  const safeTenants = Array.isArray(tenants) ? tenants : [];

  return (
    <div className="space-y-6">
      {(error || !Array.isArray(tenants)) && (
        <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error || "Could not load tenants. Refresh the page to retry."}
        </p>
      )}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-zinc-100 mb-4">Create New Tenant</h3>
        <form onSubmit={handleCreate} noValidate className="flex flex-col gap-4 sm:flex-row">
          <input
            type="text"
            aria-label="Tenant name"
            placeholder="Tenant Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-100"
          />
          <input
            type="number"
            aria-label="Initial budget in US dollars"
            min="0.01"
            step="0.01"
            placeholder="Budget (USD)"
            value={budgetUsd}
            onChange={(e) => setBudgetUsd(e.target.value)}
            className="w-48 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-100"
          />
          <button
            type="submit"
            disabled={isCreating || !name || !budgetUsd}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create tenant"}
          </button>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100">All Tenants</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Remaining balance (USD)</th>
                <th className="px-6 py-3">API Keys</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeTenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{tenant.id}</td>
                  <td className="px-6 py-4 font-medium text-zinc-200">{tenant.name}</td>
                  <td className="px-6 py-4">
                    {editingId === tenant.id ? (
                      <input type="number" min="0" step="0.01" aria-label={`Remaining balance for ${tenant.name}`}
                        value={editedBudget} onChange={(event) => setEditedBudget(event.target.value)}
                        className="w-28 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    ) : `$${Number(tenant.budgetUsd).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4">{tenant.keyCount}</td>
                  <td className="px-6 py-4">{tenant.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-6 py-4">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {editingId === tenant.id ? (
                        <>
                          <button disabled={busyId === tenant.id || editedBudget === ""} onClick={() => updateTenant(tenant.id, { budgetUsd: editedBudget })} className="text-blue-400 hover:text-blue-300 disabled:opacity-50">Save budget</button>
                          <button onClick={() => setEditingId(null)} className="text-zinc-400 hover:text-white">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditingId(tenant.id); setEditedBudget(Number(tenant.budgetUsd).toFixed(2)); }} className="text-blue-400 hover:text-blue-300">Edit budget</button>
                      )}
                      {tenant.isActive ? (
                        confirmingId === tenant.id ? (
                          <span className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
                            Stops this tenant&apos;s keys.
                            <button autoFocus onClick={() => setConfirmingId(null)} className="rounded px-2 py-1 text-zinc-200 hover:bg-zinc-700">Cancel</button>
                            <button disabled={busyId === tenant.id} onClick={() => updateTenant(tenant.id, { isActive: false })} className="rounded px-2 py-1 text-red-300 hover:bg-red-950 disabled:opacity-50">Confirm deactivation</button>
                          </span>
                        ) : <button onClick={() => setConfirmingId(tenant.id)} className="text-red-400 hover:text-red-300">Deactivate</button>
                      ) : <button disabled={busyId === tenant.id} onClick={() => updateTenant(tenant.id, { isActive: true })} className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50">Reactivate</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {safeTenants.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-zinc-400">No tenants yet. Create one above to issue API keys.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
