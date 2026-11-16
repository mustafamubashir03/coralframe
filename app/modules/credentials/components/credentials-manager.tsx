"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Plus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listWorkspaceCredentials,
  createWorkspaceCredential,
  deleteWorkspaceCredential,
  testWorkspaceCredential,
} from "@/app/modules/credentials/actions";

type Credential = Awaited<ReturnType<typeof listWorkspaceCredentials>>[number];

const PROVIDER_FIELD_HINT: Record<string, { label: string; field: string; placeholder: string }> = {
  openrouter: { label: "Field name", field: "apiKey", placeholder: "sk-or-v1-..." },
  openai: { label: "Field name", field: "apiKey", placeholder: "sk-..." },
  anthropic: { label: "Field name", field: "apiKey", placeholder: "sk-ant-..." },
  google: { label: "Field name", field: "apiKey", placeholder: "AIza..." },
  github: { label: "Field name", field: "token", placeholder: "ghp_..." },
  notion: { label: "Field name", field: "token", placeholder: "secret_..." },
  telegram: { label: "Field name", field: "botToken", placeholder: "123456789:AA..." },
  "google-calendar": { label: "Field name", field: "refreshToken", placeholder: "1//Refresh token" },
  custom: { label: "Field name", field: "token", placeholder: "token" },
};
const PROVIDERS = Object.keys(PROVIDER_FIELD_HINT);

export function CredentialsClient() {
  const [credentials, setCredentials] = useState<Credential[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testState, setTestState] = useState<Record<string, { status: "idle" | "running" | "ok" | "error"; message?: string }>>({});
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<string>(PROVIDERS[0]);
  const [fieldKey, setFieldKey] = useState("token");
  const [fieldValue, setFieldValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listWorkspaceCredentials();
        if (!cancelled) setCredentials(list);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Couldn't load credentials.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setName("");
    setProvider(PROVIDERS[0]);
    setFieldKey("token");
    setFieldValue("");
    setFormError(null);
  };

  const providerHint = PROVIDER_FIELD_HINT[provider] ?? PROVIDER_FIELD_HINT.custom;

  const handleCreate = () => {
    setFormError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Give the credential a name.");
      return;
    }
    if (!fieldValue.trim()) {
      setFormError("Enter a secret value.");
      return;
    }
    const fieldName = fieldKey.trim() || providerHint.field;
    startTransition(async () => {
      const result = await createWorkspaceCredential(trimmedName, provider, { [fieldName]: fieldValue.trim() });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      const list = await listWorkspaceCredentials();
      setCredentials(list);
      resetForm();
      setCreateOpen(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteWorkspaceCredential(id);
      const list = await listWorkspaceCredentials();
      setCredentials(list);
      setDeleteId(null);
    });
  };

  const handleTest = async (id: string) => {
    setTestState((current) => ({ ...current, [id]: { status: "running" } }));
    const result = await testWorkspaceCredential(id);
    setTestState((current) => ({
      ...current,
      [id]: result.ok ? { status: "ok" } : { status: "error", message: result.error },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Credentials</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Stored encrypted at rest (AES-256-GCM). Referenced from nodes by ID — never shown in plaintext.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="h-9 gap-1.5 text-[13px] font-semibold"><Plus className="size-4" aria-hidden="true" />Add credential</Button>} />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add credential</DialogTitle>
              <DialogDescription>
                The value is encrypted before it is stored and can never be read back via the UI.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cred-name">Name</Label>
                <Input id="cred-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production GitHub token" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cred-provider">Provider</Label>
                <select id="cred-provider" aria-label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring">
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cred-key">{providerHint.label}</Label>
                 <Input id="cred-key" value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder={providerHint.field} />
                 <p className="text-[11px] text-muted-foreground">Matches the executor field convention</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cred-value">Secret value</Label>
                 <Input id="cred-value" type="password" autoComplete="off" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} placeholder={providerHint.placeholder} />
              </div>
              {formError && <p role="alert" className="text-[12px] leading-4 text-destructive">{formError}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isPending} className="gap-1.5">
                {isPending ? "Encrypting…" : "Save credential"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadError && <p role="alert" className="text-[13px] text-destructive">{loadError}</p>}
      {credentials === null && !loadError && (
        <p className="text-[13px] text-muted-foreground">Loading credentials…</p>
      )}

      {credentials?.length === 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-10 text-center">
          <KeyRound className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">No credentials stored</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Add your first token so integrations can call APIs securely.</p>
        </div>
      )}

      {credentials && credentials.length > 0 && (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
          {credentials.map((cred) => (
            <li key={cred.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
                  <KeyRound className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">{cred.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{cred.provider}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(() => {
                  const state = testState[cred.id];
                  if (!state) {
                    return (
                      <button
                        type="button"
                        onClick={() => handleTest(cred.id)}
                        title="Test connection"
                        className="h-8 rounded-md border border-border/70 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Test
                      </button>
                    );
                  }
                  if (state.status === "running") {
                    return <span role="status" aria-live="polite" className="h-8 inline-flex items-center gap-1 px-2 text-[11px] font-medium text-muted-foreground">Testing…</span>;
                  }
                  if (state.status === "ok") {
                    return <span role="status" className="h-8 inline-flex items-center gap-1 px-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400" title="Provider accepted the credential">Connected</span>;
                  }
                  return (
                    <span role="alert" title={state.message} className="max-w-44 text-right text-[10px] leading-3 text-destructive">
                      {state.message ?? "Rejected"}
                    </span>
                  );
                })()}
                <AlertDialog open={deleteId === cred.id} onOpenChange={(open) => setDeleteId(open ? cred.id : null)}>
                <button
                  type="button"
                  aria-label={`Delete ${cred.name}`}
                  onClick={() => setDeleteId(cred.id)}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete credential?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <span className="font-semibold text-foreground">{cred.name}</span>
                      {" "}will be removed permanently. Nodes referencing it will fail until you update them.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(cred.id)} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
