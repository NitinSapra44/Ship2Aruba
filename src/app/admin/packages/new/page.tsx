"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Profile } from "@/types";

export default function NewPackagePage() {
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [form, setForm] = useState({
    tracking_number: "",
    width_cm: "",
    height_cm: "",
    length_cm: "",
    weight_kg: "",
    contents_description: "",
    client_id: "",
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "client")
        .order("full_name");
      setClients(data || []);
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: pkg, error } = await supabase
      .from("packages")
      .insert({
        tracking_number: form.tracking_number,
        width_cm: parseFloat(form.width_cm),
        height_cm: parseFloat(form.height_cm),
        length_cm: parseFloat(form.length_cm),
        weight_kg: parseFloat(form.weight_kg),
        contents_description: form.contents_description,
        client_id: form.client_id,
        status: "ready_to_send",
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Record status history
    await supabase.from("status_history").insert({
      package_id: pkg.id,
      old_status: null,
      new_status: "ready_to_send",
      changed_by_id: currentUser,
      changed_by_role: "admin",
    });

    toast.success("Package logged successfully");
    router.push("/admin/packages");
    router.refresh();
  };

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Package Intake</h1>
        <p className="text-sm text-muted-foreground mt-1">Log a new incoming package into the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackagePlus className="w-4 h-4" />
            New Package
          </CardTitle>
          <CardDescription>Fill in all package details. Status will be set to Ready to Send.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="e.g. 1Z999AA10123456784"
                value={form.tracking_number}
                onChange={(e) => update("tracking_number", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dimensions (cm)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    placeholder="Width"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.width_cm}
                    onChange={(e) => update("width_cm", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">Width</p>
                </div>
                <div>
                  <Input
                    placeholder="Height"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.height_cm}
                    onChange={(e) => update("height_cm", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">Height</p>
                </div>
                <div>
                  <Input
                    placeholder="Length"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.length_cm}
                    onChange={(e) => update("length_cm", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">Length</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                placeholder="e.g. 2.5"
                type="number"
                step="0.01"
                min="0"
                value={form.weight_kg}
                onChange={(e) => update("weight_kg", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Contents Description</Label>
              <Textarea
                id="description"
                placeholder="e.g. Electronics - Laptop computer"
                value={form.contents_description}
                onChange={(e) => update("contents_description", e.target.value)}
                required
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Assign to Client</Label>
              <Select value={form.client_id} onValueChange={(v) => update("client_id", v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} — {c.suite_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !form.client_id}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging Package…
                </>
              ) : (
                "Log Package"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
