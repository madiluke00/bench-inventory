import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Trash2, Wrench, Boxes, MapPin, X, AlertCircle, Hammer, Tag, ChevronDown, ChevronUp, RefreshCw, Pencil, Check, LogOut, Shield, UserPlus, Trash, Package } from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const FONTS_ID = "bench-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ---- LOGIN PAGE ----
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#0F1714", fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="w-full max-w-sm px-6">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#1B2622", border: "1px solid #2A3A33" }}>
            <Boxes size={16} color="#5FB88A" />
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.01em", color: "#EAF0EC" }} className="text-xl">
            BENCH<span style={{ color: "#D98A4B" }}>.</span>
          </h1>
        </div>
        <div className="flex flex-col gap-3" style={{ background: "#141F1B", border: "1px solid #233029", borderRadius: 8, padding: "1.5rem" }}>
          <p className="text-xs text-center mb-2" style={{ color: "#8FA39A" }}>Sign in to continue</p>
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className={`${inputCls} bench-input`}
            style={{ background: "#131D19", borderColor: "#2A3A33", color: "#EAF0EC" }}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className={`${inputCls} bench-input`}
            style={{ background: "#131D19", borderColor: "#2A3A33", color: "#EAF0EC" }}
          />
          {error && <p className="text-xs" style={{ color: "#E0664C" }}>{error}</p>}
          <button onClick={login} disabled={loading} className="px-3 py-2 text-sm rounded mt-1" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function totalQty(part) {
  if (part.has_variants) return (part.variants || []).reduce((s, v) => s + (v.units || []).length, 0);
  return part.serialized ? (part.serials || []).length : part.qty;
}
function allocatedQty(part) {
  if (part.has_variants) return (part.variants || []).reduce((s, v) => s + (v.units || []).filter((u) => u.allocatedBuildId).length, 0);
  if (part.serialized) return (part.serials || []).filter((s) => s.allocatedBuildId).length;
  return (part.allocations || []).reduce((s, a) => s + a.qty, 0);
}
function availableQty(part) { return totalQty(part) - allocatedQty(part); }
function variantAvailableQty(variant) {
  return (variant.units || []).filter((u) => !u.allocatedBuildId).length;
}

function StatusDot({ part }) {
  const avail = availableQty(part);
  const total = totalQty(part);
  let color = "#5FB88A";
  if (total === 0 || avail <= 0) color = "#E0664C";
  else if (avail < total) color = "#D98A4B";
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}99` }} />;
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-wider" style={{ color: "#8FA39A", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>{label}</span>
      {children}
    </label>
  );
}

function LocationDisplay({ location, location2 }) {
  if (!location && !location2) return null;
  return (
    <div className="flex flex-col gap-0.5 mt-1.5">
      {location && (
        <div className="flex items-center gap-1">
          <MapPin size={11} color="#6B8077" />
          <span className="text-[10px] uppercase" style={{ color: "#5C6E66", letterSpacing: "0.05em" }}>Primary</span>
          <span className="text-xs" style={{ color: "#8FA39A" }}>{location}</span>
        </div>
      )}
      {location2 && (
        <div className="flex items-center gap-1 pl-3">
          <span className="text-[10px] uppercase" style={{ color: "#5C6E66", letterSpacing: "0.05em" }}>Sub</span>
          <span className="text-xs" style={{ color: "#8FA39A" }}>{location2}</span>
        </div>
      )}
    </div>
  );
}

const inputCls = "bg-transparent border rounded px-2 py-1.5 text-sm outline-none transition-colors";

export default function LabInventory() {
  useFonts();

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      else { setUserRole(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
      if (error) throw error;
      setUserRole(data?.role || "viewer");
    } catch (e) {
      console.error("Role fetch error:", e);
      setUserRole("viewer");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = () => supabase.auth.signOut();
  const isAdmin = userRole === "admin";

  const [parts, setParts] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("parts");

  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState({ name: "", qty: "1", location: "", location2: "", category: "", serialized: false, serialsText: "", has_variants: false, variantsText: "", tags: [] });

  const [showAddBuild, setShowAddBuild] = useState(false);
  const [newBuild, setNewBuild] = useState({ name: "", location: "", location2: "" });
  const [buildLines, setBuildLines] = useState([{ id: uid(), partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }]);
  const [buildError, setBuildError] = useState("");
  const [subbuilds, setSubbuilds] = useState([]);
  const [showAddSubBuild, setShowAddSubBuild] = useState(false);
  const [newSubBuild, setNewSubBuild] = useState({ name: "", location: "", location2: "" });
  const [subBuildLines, setSubBuildLines] = useState([{ id: uid(), partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }]);
  const [subBuildError, setSubBuildError] = useState("");
  const [subbuildSelections, setSubbuildSelections] = useState([]);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const [{ data: partsData, error: pErr }, { data: buildsData, error: bErr }, { data: subbuildsData, error: sErr }] =
        await Promise.all([supabase.from("parts").select("*"), supabase.from("builds").select("*"), supabase.from("subbuilds").select("*")]);
      if (pErr) throw pErr;
      if (bErr) throw bErr;
      if (sErr) throw sErr;
      setParts((partsData || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
      setBuilds((buildsData || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
      setSubbuilds((subbuildsData || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    } catch {
      setError("Couldn't connect to database. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const [lastSynced, setLastSynced] = useState(null);

  const syncData = async () => {
    try {
      const [{ data: partsData, error: pErr }, { data: buildsData, error: bErr }, { data: subbuildsData, error: sErr }] =
        await Promise.all([supabase.from("parts").select("*"), supabase.from("builds").select("*"), supabase.from("subbuilds").select("*")]);
      if (pErr || bErr || sErr) return;
      setParts(partsData || []);
      setBuilds(buildsData || []);
      setSubbuilds(subbuildsData || []);
      setLastSynced(new Date());
    } catch {}
  };

  useEffect(() => { if (user) loadData().then(() => setLastSynced(new Date())); }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const anyFormOpen = showAddPart || showAddBuild;
      if (!anyFormOpen) syncData();
    }, 30000);
    return () => clearInterval(interval);
  }, [showAddPart, showAddBuild]);

  const addPart = async () => {
    if (!newPart.name.trim()) return;
    let part;
    if (newPart.has_variants) {
      const variants = newPart.variantsText
        .split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        .map((v) => ({ id: uid(), name: v, units: [] }));
      part = {
        id: uid(), name: newPart.name.trim(),
        location: newPart.location.trim() || "Lab", location2: newPart.location2.trim(),
        category: newPart.category.trim(), has_variants: true, variants,
        serialized: false, qty: 0, allocations: [], serials: [], tags: newPart.tags,
      };
    } else if (newPart.serialized) {
      part = {
        id: uid(), name: newPart.name.trim(),
        location: newPart.location.trim() || "Lab", location2: newPart.location2.trim(),
        category: newPart.category.trim(), serialized: true, qty: 0, allocations: [],
        has_variants: false, variants: [], tags: newPart.tags,
        serials: newPart.serialsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
          .map((s) => ({ id: uid(), serial: s, allocatedBuildId: null, location: newPart.location.trim() || "Lab", location2: newPart.location2.trim() })),
      };
    } else {
      part = {
        id: uid(), name: newPart.name.trim(), qty: Math.max(0, parseInt(newPart.qty, 10) || 0),
        location: newPart.location.trim() || "Lab", location2: newPart.location2.trim(),
        category: newPart.category.trim(), serialized: false, allocations: [], serials: [],
        has_variants: false, variants: [], tags: newPart.tags,
      };
    }
    const { error } = await supabase.from("parts").insert(part);
    if (error) { alert("Failed to save part: " + error.message); return; }
    setParts((p) => [...p, part].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    setNewPart({ name: "", qty: "1", location: "", location2: "", category: "", serialized: false, serialsText: "", has_variants: false, variantsText: "", tags: [] });
    setShowAddPart(false);
  };

  const deletePart = async (id) => {
    const { error } = await supabase.from("parts").delete().eq("id", id);
    if (error) { alert("Failed to delete: " + error.message); return; }
    setParts((p) => p.filter((x) => x.id !== id));
    const affectedBuilds = builds.filter((b) => b.lines.some((l) => l.partId === id));
    for (const build of affectedBuilds) {
      const newLines = build.lines.filter((l) => l.partId !== id);
      await supabase.from("builds").update({ lines: newLines }).eq("id", build.id);
    }
    setBuilds((b) => b.map((bd) => ({ ...bd, lines: bd.lines.filter((l) => l.partId !== id) })));
  };

  const updatePart = async (id, updates) => {
    const { error } = await supabase.from("parts").update(updates).eq("id", id);
    if (error) { alert("Failed to update: " + error.message); return; }
    setParts((p) => p.map((x) => (x.id === id ? { ...x, ...updates } : x)));
  };

  const adjustQty = (id, delta) => {
    const part = parts.find((p) => p.id === id);
    if (!part || part.serialized) return;
    updatePart(id, { qty: Math.max(allocatedQty(part), part.qty + delta) });
  };

  // Update an individual serial's fields (e.g. location)
  const updateSerial = async (partId, serialId, updates) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const newSerials = part.serials.map((s) => s.id === serialId ? { ...s, ...updates } : s);
    await updatePart(partId, { serials: newSerials });
  };

  const addSerial = async (partId, serial, partLocation, partLocation2) => {
    if (!serial.trim()) return;
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    const newSerials = [...(part.serials || []), {
      id: uid(), serial: serial.trim(), allocatedBuildId: null,
      location: partLocation || part.location || "Lab",
      location2: partLocation2 || part.location2 || "",
    }];
    await updatePart(partId, { serials: newSerials });
  };

  const removeSerial = async (partId, serialId) => {
    const part = parts.find((p) => p.id === partId);
    if (!part) return;
    await updatePart(partId, { serials: part.serials.filter((s) => s.id !== serialId) });
  };

  const addBuildLine = () => setBuildLines((l) => [...l, { id: uid(), partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }]);
  const addSubBuildLine = () => setSubBuildLines((l) => [...l, { id: uid(), partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }]);
  const removeSubBuildLine = (id) => setSubBuildLines((l) => l.filter((x) => x.id !== id));
  const updateSubBuildLine = (id, field, value) => setSubBuildLines((l) => l.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const toggleSubBuildLineSerial = (id, serialId) =>
    setSubBuildLines((l) => l.map((x) =>
      x.id === id ? { ...x, serialIds: x.serialIds.includes(serialId) ? x.serialIds.filter((s) => s !== serialId) : [...x.serialIds, serialId] } : x
    ));
  const removeBuildLine = (id) => setBuildLines((l) => l.filter((x) => x.id !== id));
  const updateBuildLine = (id, field, value) => setBuildLines((l) => l.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const toggleBuildLineSerial = (id, serialId) =>
    setBuildLines((l) => l.map((x) =>
      x.id === id ? { ...x, serialIds: x.serialIds.includes(serialId) ? x.serialIds.filter((s) => s !== serialId) : [...x.serialIds, serialId] } : x
    ));

  const createBuild = async () => {
    setBuildError("");
    if (!newBuild.name.trim()) { setBuildError("Give the build a name."); return; }
    const lines = [];
    for (const l of buildLines) {
      if (!l.partId) continue;
      const part = parts.find((p) => p.id === l.partId);
      if (!part) continue;
      if (part.has_variants) {
        if (l.variantId && l.unitIds && l.unitIds.length > 0) lines.push({ partId: l.partId, qty: l.unitIds.length, variantId: l.variantId, unitIds: l.unitIds });
      } else if (part.serialized) {
        if (l.serialIds.length > 0) lines.push({ partId: l.partId, qty: l.serialIds.length, serialIds: l.serialIds });
      } else {
        const qty = parseInt(l.qty, 10) || 0;
        if (qty > 0) lines.push({ partId: l.partId, qty });
      }
    }
    if (lines.length === 0) { setBuildError("Add at least one part to the build."); return; }
    for (const line of lines) {
      const part = parts.find((p) => p.id === line.partId);
      if (!part) continue;
      if (part.has_variants) {
        const variant = (part.variants || []).find((v) => v.id === line.variantId);
        if (variant && line.unitIds && line.unitIds.length > variantAvailableQty(variant)) { setBuildError(`Not enough "${part.name} — ${variant.name}" available (${variantAvailableQty(variant)} free).`); return; }
      } else if (line.qty > availableQty(part)) {
        setBuildError(`Not enough "${part.name}" available (${availableQty(part)} free).`); return;
      }
    }
    const buildId = uid();
    const build = { id: buildId, name: newBuild.name.trim(), location: newBuild.location.trim() || "Lab", location2: newBuild.location2.trim(), lines, created_at: new Date().toISOString() };
    const { error: bErr } = await supabase.from("builds").insert(build);
    if (bErr) { alert("Failed to save build: " + bErr.message); return; }
    const updatedParts = parts.map((part) => {
      const line = lines.find((l) => l.partId === part.id);
      if (!line) return part;
      if (part.has_variants) {
        return { ...part, variants: (part.variants || []).map((v) => v.id === line.variantId ? { ...v, units: (v.units || []).map((u) => (line.unitIds || []).includes(u.id) ? { ...u, allocatedBuildId: buildId, location: build.location, location2: build.location2 } : u) } : v) };
      }
      if (part.serialized) return { ...part, serials: part.serials.map((s) => line.serialIds.includes(s.id) ? { ...s, allocatedBuildId: buildId, location: build.location, location2: build.location2 } : s) };
      return { ...part, allocations: [...(part.allocations || []), { buildId, qty: line.qty, location: build.location, location2: build.location2 }] };
    });
    for (const part of updatedParts) {
      const orig = parts.find((p) => p.id === part.id);
      if (part.has_variants && JSON.stringify(part.variants) !== JSON.stringify(orig.variants))
        await supabase.from("parts").update({ variants: part.variants }).eq("id", part.id);
      if (part.serialized && JSON.stringify(part.serials) !== JSON.stringify(orig.serials))
        await supabase.from("parts").update({ serials: part.serials }).eq("id", part.id);
      if (!part.serialized && !part.has_variants && JSON.stringify(part.allocations) !== JSON.stringify(orig.allocations))
        await supabase.from("parts").update({ allocations: part.allocations }).eq("id", part.id);
    }
    setParts(updatedParts);
    for (const subbuildId of subbuildSelections) {
      await supabase.from("subbuilds").update({ allocated_build_id: buildId, location: build.location, location2: build.location2 }).eq("id", subbuildId);
    }
    const subbuildLines = subbuildSelections.map((subbuildId) => ({ subbuildId }));
    if (subbuildLines.length > 0) {
      const finalLines = [...lines, ...subbuildLines];
      await supabase.from("builds").update({ lines: finalLines }).eq("id", buildId);
      build.lines = finalLines;
    }
    setSubbuilds((s) => s.map((x) => subbuildSelections.includes(x.id) ? { ...x, allocated_build_id: buildId, location: build.location, location2: build.location2 } : x));
    setBuilds((b) => [...b, build].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    setNewBuild({ name: "", location: "", location2: "" });
    setBuildLines([{ id: uid(), partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }]);
    setSubbuildSelections([]);
    setShowAddBuild(false);
  };

  const disassembleBuild = async (buildId) => {
    const updatedParts = parts.map((part) => {
      if (part.has_variants) return { ...part, variants: (part.variants || []).map((v) => ({ ...v, units: (v.units || []).map((u) => u.allocatedBuildId === buildId ? { ...u, allocatedBuildId: null, location: part.location, location2: part.location2 } : u) })) };
      if (part.serialized) return { ...part, serials: (part.serials || []).map((s) => s.allocatedBuildId === buildId ? { ...s, allocatedBuildId: null, location: part.location, location2: part.location2 } : s) };
      return { ...part, allocations: (part.allocations || []).filter((a) => a.buildId !== buildId) };
    });
    for (const part of updatedParts) {
      const orig = parts.find((p) => p.id === part.id);
      if (part.has_variants && JSON.stringify(part.variants) !== JSON.stringify(orig.variants))
        await supabase.from("parts").update({ variants: part.variants }).eq("id", part.id);
      if (part.serialized && JSON.stringify(part.serials) !== JSON.stringify(orig.serials))
        await supabase.from("parts").update({ serials: part.serials }).eq("id", part.id);
      if (!part.serialized && !part.has_variants && JSON.stringify(part.allocations) !== JSON.stringify(orig.allocations))
        await supabase.from("parts").update({ allocations: part.allocations }).eq("id", part.id);
    }
    const build = builds.find((b) => b.id === buildId);
    if (build) {
      const subbuildLines = (build.lines || []).filter((l) => l.subbuildId);
      for (const line of subbuildLines) {
        await supabase.from("subbuilds").update({ allocated_build_id: null }).eq("id", line.subbuildId);
      }
      setSubbuilds((s) => s.map((x) => subbuildLines.some((l) => l.subbuildId === x.id) ? { ...x, allocated_build_id: null } : x));
    }
    const { error } = await supabase.from("builds").delete().eq("id", buildId);
    if (error) { alert("Failed to disassemble: " + error.message); return; }
    setParts(updatedParts);
    setBuilds((b) => b.filter((x) => x.id !== buildId));
  };

  const removePartFromBuild = async (buildId, partId, serialIds) => {
    const build = builds.find((b) => b.id === buildId);
    const part = parts.find((p) => p.id === partId);
    if (!build || !part) return;
    const newLines = build.lines.filter((l) => l.partId !== partId);
    let partUpdates = {};
    if (part.has_variants) {
      partUpdates.variants = part.variants.map((v) => ({ ...v, units: (v.units || []).map((u) => u.allocatedBuildId === buildId ? { ...u, allocatedBuildId: null, location: part.location, location2: part.location2 } : u) }));
    } else if (part.serialized) {
      partUpdates.serials = part.serials.map((s) => serialIds.includes(s.id) ? { ...s, allocatedBuildId: null, location: part.location, location2: part.location2 } : s);
    } else {
      partUpdates.allocations = (part.allocations || []).filter((a) => a.buildId !== buildId);
    }
    await supabase.from("builds").update({ lines: newLines }).eq("id", buildId);
    await supabase.from("parts").update(partUpdates).eq("id", partId);
    setParts((p) => p.map((x) => x.id === partId ? { ...x, ...partUpdates } : x));
    setBuilds((b) => b.map((x) => x.id === buildId ? { ...x, lines: newLines } : x));
  };

  const addPartToBuild = async (buildId, partId, qty, serialIds, variantId, unitIds) => {
    const build = builds.find((b) => b.id === buildId);
    const part = parts.find((p) => p.id === partId);
    if (!build || !part) return;
    if (part.has_variants && (!unitIds || unitIds.length === 0)) return;
    if (part.serialized && serialIds.length === 0) return;
    if (!part.serialized && !part.has_variants && (qty <= 0 || qty > availableQty(part))) return;
    const existingLineIdx = build.lines.findIndex((l) => l.partId === partId && l.variantId === variantId);
    let newLines;
    if (part.has_variants) {
      if (existingLineIdx >= 0) {
        newLines = build.lines.map((l, i) => i === existingLineIdx ? { ...l, unitIds: [...(l.unitIds || []), ...unitIds], qty: l.qty + unitIds.length } : l);
      } else {
        newLines = [...build.lines, { partId, variantId, qty: unitIds.length, unitIds }];
      }
    } else if (existingLineIdx >= 0) {
      newLines = build.lines.map((l, i) => i === existingLineIdx
        ? part.serialized
          ? { ...l, serialIds: [...l.serialIds, ...serialIds], qty: l.qty + serialIds.length }
          : { ...l, qty: l.qty + qty }
        : l);
    } else {
      newLines = [...build.lines, part.serialized ? { partId, qty: serialIds.length, serialIds } : { partId, qty }];
    }
    let partUpdates = {};
    if (part.has_variants) {
      partUpdates.variants = part.variants.map((v) => v.id === variantId ? { ...v, units: (v.units || []).map((u) => unitIds.includes(u.id) ? { ...u, allocatedBuildId: buildId, location: build.location, location2: build.location2 } : u) } : v);
    } else if (part.serialized) {
      partUpdates.serials = part.serials.map((s) => serialIds.includes(s.id) ? { ...s, allocatedBuildId: buildId, location: build.location, location2: build.location2 } : s);
    } else {
      partUpdates.allocations = [...(part.allocations || []), { buildId, qty, location: build.location, location2: build.location2 }];
    }
    await supabase.from("builds").update({ lines: newLines }).eq("id", buildId);
    await supabase.from("parts").update(partUpdates).eq("id", partId);
    setParts((p) => p.map((x) => x.id === partId ? { ...x, ...partUpdates } : x));
    setBuilds((b) => b.map((x) => x.id === buildId ? { ...x, lines: newLines } : x));
  };
  const updateBuild = async (buildId, updates) => {
    const { error } = await supabase.from("builds").update(updates).eq("id", buildId);
    if (error) return;
    setBuilds((b) => b.map((x) => (x.id === buildId ? { ...x, ...updates } : x)));
    if (updates.location !== undefined || updates.location2 !== undefined) {
      const build = builds.find((b) => b.id === buildId);
      if (!build) return;
      const newLoc = updates.location ?? build.location;
      const newLoc2 = updates.location2 ?? build.location2;
      const updatedParts = parts.map((part) => {
        const line = build.lines.find((l) => l.partId === part.id);
        if (!line) return part;
        if (part.has_variants) {
          return { ...part, variants: (part.variants || []).map((v) => v.id === line.variantId ? { ...v, units: (v.units || []).map((u) => u.allocatedBuildId === buildId ? { ...u, location: newLoc, location2: newLoc2 } : u) } : v) };
        }
        if (part.serialized) {
          return { ...part, serials: (part.serials || []).map((s) => s.allocatedBuildId === buildId ? { ...s, location: newLoc, location2: newLoc2 } : s) };
        }
        return { ...part, allocations: (part.allocations || []).map((a) => a.buildId === buildId ? { ...a, location: newLoc, location2: newLoc2 } : a) };
      });
      for (const part of updatedParts) {
        const orig = parts.find((p) => p.id === part.id);
        if (!orig) continue;
        if (part.has_variants && JSON.stringify(part.variants) !== JSON.stringify(orig.variants))
          await supabase.from("parts").update({ variants: part.variants }).eq("id", part.id);
        if (part.serialized && JSON.stringify(part.serials) !== JSON.stringify(orig.serials))
          await supabase.from("parts").update({ serials: part.serials }).eq("id", part.id);
        if (!part.serialized && !part.has_variants && JSON.stringify(part.allocations) !== JSON.stringify(orig.allocations))
          await supabase.from("parts").update({ allocations: part.allocations }).eq("id", part.id);
      }
      setParts(updatedParts);
    }
  };

  const createSubBuild = async () => {
    setSubBuildError("");
    if (!newSubBuild.name.trim()) { setSubBuildError("Give the sub-build a name."); return; }
    const lines = [];
    for (const l of subBuildLines) {
      if (!l.partId) continue;
      const part = parts.find((p) => p.id === l.partId);
      if (!part) continue;
      if (part.has_variants) {
        if (l.variantId && l.unitIds && l.unitIds.length > 0) lines.push({ partId: l.partId, qty: l.unitIds.length, variantId: l.variantId, unitIds: l.unitIds });
      } else if (part.serialized) {
        if (l.serialIds.length > 0) lines.push({ partId: l.partId, qty: l.serialIds.length, serialIds: l.serialIds });
      } else {
        const qty = parseInt(l.qty, 10) || 0;
        if (qty > 0) lines.push({ partId: l.partId, qty });
      }
    }
    if (lines.length === 0) { setSubBuildError("Add at least one part."); return; }
    for (const line of lines) {
      const part = parts.find((p) => p.id === line.partId);
      if (!part) continue;
      if (part.has_variants) {
        const variant = (part.variants || []).find((v) => v.id === line.variantId);
        if (variant && line.unitIds && line.unitIds.length > variantAvailableQty(variant)) { setSubBuildError(`Not enough "${part.name} — ${variant.name}" available.`); return; }
      } else if (line.qty > availableQty(part)) {
        setSubBuildError(`Not enough "${part.name}" available.`); return;
      }
    }
    const subbuildId = uid();
    const subbuild = { id: subbuildId, name: newSubBuild.name.trim(), location: newSubBuild.location.trim() || "Lab", location2: newSubBuild.location2.trim(), lines, allocated_build_id: null, created_at: new Date().toISOString() };
    const { error: sErr } = await supabase.from("subbuilds").insert(subbuild);
    if (sErr) { alert("Failed to save sub-build: " + sErr.message); return; }
    const updatedParts = parts.map((part) => {
      const line = lines.find((l) => l.partId === part.id);
      if (!line) return part;
      if (part.has_variants) return { ...part, variants: (part.variants || []).map((v) => v.id === line.variantId ? { ...v, units: (v.units || []).map((u) => (line.unitIds || []).includes(u.id) ? { ...u, allocatedBuildId: subbuildId, location: subbuild.location, location2: subbuild.location2 } : u) } : v) };
      if (part.serialized) return { ...part, serials: part.serials.map((s) => line.serialIds.includes(s.id) ? { ...s, allocatedBuildId: subbuildId, location: subbuild.location, location2: subbuild.location2 } : s) };
      return { ...part, allocations: [...(part.allocations || []), { buildId: subbuildId, qty: line.qty, location: subbuild.location, location2: subbuild.location2 }] };
    });
    for (const part of updatedParts) {
      const orig = parts.find((p) => p.id === part.id);
      if (part.has_variants && JSON.stringify(part.variants) !== JSON.stringify(orig.variants)) await supabase.from("parts").update({ variants: part.variants }).eq("id", part.id);
      if (part.serialized && JSON.stringify(part.serials) !== JSON.stringify(orig.serials)) await supabase.from("parts").update({ serials: part.serials }).eq("id", part.id);
      if (!part.serialized && !part.has_variants && JSON.stringify(part.allocations) !== JSON.stringify(orig.allocations)) await supabase.from("parts").update({ allocations: part.allocations }).eq("id", part.id);
    }
    setParts(updatedParts);
    setSubbuilds((s) => [...s, subbuild].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    setNewSubBuild({ name: "", location: "", location2: "" });
    setSubBuildLines([{ id: uid(), partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }]);
    setShowAddSubBuild(false);
  };

  const disassembleSubBuild = async (subbuildId) => {
    const updatedParts = parts.map((part) => {
      if (part.has_variants) return { ...part, variants: (part.variants || []).map((v) => ({ ...v, units: (v.units || []).map((u) => u.allocatedBuildId === subbuildId ? { ...u, allocatedBuildId: null, location: part.location, location2: part.location2 } : u) })) };
      if (part.serialized) return { ...part, serials: (part.serials || []).map((s) => s.allocatedBuildId === subbuildId ? { ...s, allocatedBuildId: null, location: part.location, location2: part.location2 } : s) };
      return { ...part, allocations: (part.allocations || []).filter((a) => a.buildId !== subbuildId) };
    });
    for (const part of updatedParts) {
      const orig = parts.find((p) => p.id === part.id);
      if (part.has_variants && JSON.stringify(part.variants) !== JSON.stringify(orig.variants)) await supabase.from("parts").update({ variants: part.variants }).eq("id", part.id);
      if (part.serialized && JSON.stringify(part.serials) !== JSON.stringify(orig.serials)) await supabase.from("parts").update({ serials: part.serials }).eq("id", part.id);
      if (!part.serialized && !part.has_variants && JSON.stringify(part.allocations) !== JSON.stringify(orig.allocations)) await supabase.from("parts").update({ allocations: part.allocations }).eq("id", part.id);
    }
    const { error } = await supabase.from("subbuilds").delete().eq("id", subbuildId);
    if (error) { alert("Failed to disassemble: " + error.message); return; }
    setParts(updatedParts);
    setSubbuilds((s) => s.filter((x) => x.id !== subbuildId));
  };

  const updateSubBuild = async (subbuildId, updates) => {
    const { error } = await supabase.from("subbuilds").update(updates).eq("id", subbuildId);
    if (error) return;
    setSubbuilds((s) => s.map((x) => (x.id === subbuildId ? { ...x, ...updates } : x)));
  };

  const addSubbuildToMainBuild = async (buildId, subbuildId) => {
    const build = builds.find((b) => b.id === buildId);
    const subbuild = subbuilds.find((s) => s.id === subbuildId);
    if (!build || !subbuild || subbuild.allocated_build_id) return;
    const newLines = [...build.lines, { subbuildId }];
    await supabase.from("builds").update({ lines: newLines }).eq("id", buildId);
    await supabase.from("subbuilds").update({ allocated_build_id: buildId, location: build.location, location2: build.location2 }).eq("id", subbuildId);
    setBuilds((b) => b.map((x) => x.id === buildId ? { ...x, lines: newLines } : x));
    setSubbuilds((s) => s.map((x) => x.id === subbuildId ? { ...x, allocated_build_id: buildId, location: build.location, location2: build.location2 } : x));
  };

  const removeSubbuildFromMainBuild = async (buildId, subbuildId) => {
    const build = builds.find((b) => b.id === buildId);
    if (!build) return;
    const newLines = build.lines.filter((l) => l.subbuildId !== subbuildId);
    await supabase.from("builds").update({ lines: newLines }).eq("id", buildId);
    await supabase.from("subbuilds").update({ allocated_build_id: null }).eq("id", subbuildId);
    setBuilds((b) => b.map((x) => x.id === buildId ? { ...x, lines: newLines } : x));
    setSubbuilds((s) => s.map((x) => x.id === subbuildId ? { ...x, allocated_build_id: null } : x));
  };

  const partsById = Object.fromEntries(parts.map((p) => [p.id, p]));
  const subbuildsById = Object.fromEntries(subbuilds.map((s) => [s.id, s]));

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1714" }}>
      <RefreshCw size={16} color="#5FB88A" className="animate-spin" />
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen w-full" style={{ background: "#0F1714", color: "#EAF0EC", fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        ::selection { background: #D98A4B55; }
        input::placeholder, textarea::placeholder { color: #5C6E66; }
        .bench-input { background: #131D19; border-color: #2A3A33; color: #EAF0EC; }
        .bench-input:focus { border-color: #5FB88A; }
        .bench-card { background: #141F1B; border: 1px solid #233029; }
        .grid-bg { background-image: linear-gradient(#1B2622 1px, transparent 1px), linear-gradient(90deg, #1B2622 1px, transparent 1px); background-size: 24px 24px; }
      `}</style>

      <div className="grid-bg border-b" style={{ borderColor: "#233029" }}>
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#1B2622", border: "1px solid #2A3A33" }}>
                <Boxes size={16} color="#5FB88A" />
              </div>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }} className="text-xl">
                BENCH<span style={{ color: "#D98A4B" }}>.</span>
                <span className="text-[10px] ml-2" style={{ color: "#5C6E66", fontFamily: "'JetBrains Mono', monospace", fontWeight: 400 }}>v3.0</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {lastSynced && (
                <span className="text-[10px]" style={{ color: "#5C6E66" }}>
                  last sync {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button onClick={signOut} className="w-7 h-7 flex items-center justify-center rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }} title="Sign out">
                <LogOut size={13} />
              </button><button onClick={() => { loadData().then(() => setLastSynced(new Date())); }} className="w-7 h-7 flex items-center justify-center rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }} title="Refresh">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs" style={{ color: "#8FA39A" }}>Parts inventory &amp; build tracking</p>
          <div className="flex gap-1 mt-5">
            {[{ id: "parts", label: "Parts", icon: Boxes }, { id: "subbuilds", label: "Sub-builds", icon: Package }, { id: "builds", label: "Builds", icon: Hammer }, ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Shield }] : [])].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t transition-colors"
                style={{ background: tab === t.id ? "#141F1B" : "transparent", color: tab === t.id ? "#EAF0EC" : "#8FA39A", border: "1px solid", borderColor: tab === t.id ? "#233029" : "transparent", borderBottom: tab === t.id ? "1px solid #141F1B" : "1px solid transparent", marginBottom: "-1px" }}>
                <t.icon size={13} />{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {error && <div className="bench-card rounded p-4 mb-4 flex items-center gap-2 text-sm" style={{ color: "#E0664C" }}><AlertCircle size={16} />{error}</div>}
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#8FA39A" }}><RefreshCw size={14} className="animate-spin" /> Loading…</div>
        ) : tab === "parts" ? (
          <PartsTab
            parts={parts} showAddPart={showAddPart} setShowAddPart={setShowAddPart}
            newPart={newPart} setNewPart={setNewPart} addPart={addPart}
            deletePart={deletePart} adjustQty={adjustQty} updatePart={updatePart}
            updateSerial={updateSerial} addSerial={addSerial} removeSerial={removeSerial}
            builds={builds} subbuilds={subbuilds} isAdmin={isAdmin}
          />
        ) : tab === "subbuilds" ? (
          <SubBuildsTab
            subbuilds={subbuilds} parts={parts} partsById={partsById} builds={builds}
            showAddSubBuild={showAddSubBuild} setShowAddSubBuild={setShowAddSubBuild}
            newSubBuild={newSubBuild} setNewSubBuild={setNewSubBuild}
            subBuildLines={subBuildLines} addSubBuildLine={addSubBuildLine}
            removeSubBuildLine={removeSubBuildLine} updateSubBuildLine={updateSubBuildLine}
            toggleSubBuildLineSerial={toggleSubBuildLineSerial} createSubBuild={createSubBuild}
            subBuildError={subBuildError} disassembleSubBuild={disassembleSubBuild} updateSubBuild={updateSubBuild}
            isAdmin={isAdmin}
          />
        ) : tab === "builds" ? (
          <BuildsTab
            builds={builds} parts={parts} partsById={partsById}
            subbuilds={subbuilds} subbuildsById={subbuildsById}
            subbuildSelections={subbuildSelections} setSubbuildSelections={setSubbuildSelections}
            showAddBuild={showAddBuild} setShowAddBuild={setShowAddBuild}
            newBuild={newBuild} setNewBuild={setNewBuild}
            buildLines={buildLines} addBuildLine={addBuildLine}
            removeBuildLine={removeBuildLine} updateBuildLine={updateBuildLine}
            toggleBuildLineSerial={toggleBuildLineSerial} createBuild={createBuild}
            buildError={buildError} disassembleBuild={disassembleBuild} updateBuild={updateBuild}
            removePartFromBuild={removePartFromBuild} addPartToBuild={addPartToBuild}
            addSubbuildToMainBuild={addSubbuildToMainBuild} removeSubbuildFromMainBuild={removeSubbuildFromMainBuild}
            isAdmin={isAdmin}
          />
        ) : (
          <AdminPanel />
        )}
      </div>
    </div>
  );
}

// ---- EDIT PART FORM ----
function EditPartForm({ part, onSave, onCancel, usedQty }) {
  const [draft, setDraft] = useState({ name: part.name, category: part.category || "", location: part.location || "", location2: part.location2 || "", qty: part.qty ?? 0, tags: part.tags || [] });
  const save = () => {
    if (!draft.name.trim()) return;
    const updates = { name: draft.name.trim(), category: draft.category.trim(), location: draft.location.trim() || "Lab", location2: draft.location2.trim(), tags: draft.tags };
    if (!part.serialized) updates.qty = Math.max(usedQty, parseInt(draft.qty, 10) || 0);
    onSave(updates);
  };
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "#233029" }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name"><input autoFocus className={`${inputCls} bench-input`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
        <Field label="Category"><input className={`${inputCls} bench-input`} value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} placeholder="e.g. Microcontroller" /></Field>
        <Field label="Primary Location"><input className={`${inputCls} bench-input`} value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} placeholder="e.g. Building A" /></Field>
        <Field label="Sub Location"><input className={`${inputCls} bench-input`} value={draft.location2} onChange={(e) => setDraft((d) => ({ ...d, location2: e.target.value }))} placeholder="e.g. Shelf 3" /></Field>
        {!part.serialized && <Field label="Quantity"><input type="number" min={usedQty} className={`${inputCls} bench-input`} value={draft.qty} onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))} /></Field>}
      </div>
      <div className="mt-2">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "#8FA39A" }}>Tags</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {(draft.tags || []).map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded" style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#5FB88A" }}>
              {tag}
              <button onClick={() => setDraft((d) => ({ ...d, tags: d.tags.filter((t) => t !== tag) }))} style={{ color: "#6B8077" }}><X size={10} /></button>
            </span>
          ))}
          <input
            placeholder="Add tag…"
            className="text-[11px] bg-transparent outline-none border-b py-0.5"
            style={{ color: "#EAF0EC", borderColor: "#2A3A33", width: "100px" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                const tag = e.target.value.trim();
                if (!draft.tags.includes(tag)) setDraft((d) => ({ ...d, tags: [...d.tags, tag] }));
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}><Check size={12} /> Save</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- EDIT SERIAL ----
function EditSerialLocation({ serial, onSave, onCancel }) {
  const [draft, setDraft] = useState({ serial: serial.serial || "", location: serial.location || "", location2: serial.location2 || "" });
  return (
    <div className="flex flex-col gap-1.5 mt-1 pl-2">
      <div className="grid grid-cols-2 gap-1.5">
        <input className={`${inputCls} bench-input text-xs py-1`} placeholder="Serial number" value={draft.serial} onChange={(e) => setDraft((d) => ({ ...d, serial: e.target.value }))} />
        <div />
        <input className={`${inputCls} bench-input text-xs py-1`} placeholder="Primary location" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
        <input className={`${inputCls} bench-input text-xs py-1`} placeholder="Sub location" value={draft.location2} onChange={(e) => setDraft((d) => ({ ...d, location2: e.target.value }))} />
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onSave(draft)} className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}><Check size={10} /> Save</button>
        <button onClick={onCancel} className="px-2 py-0.5 text-[11px] rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- ADD VARIANT UNIT ----
function VariantUnitAdd({ part, variant, updatePart }) {
  const [draft, setDraft] = useState({ location: part.location || "", location2: part.location2 || "" });
  const [show, setShow] = useState(false);
  if (!show) return (
    <button onClick={() => setShow(true)} className="flex items-center gap-1 text-[11px] mt-1" style={{ color: "#5FB88A" }}>
      <Plus size={10} /> Add variant
    </button>
  );
  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="grid grid-cols-2 gap-1">
        <input className={`${inputCls} bench-input text-xs py-1`} placeholder="Primary location" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
        <input className={`${inputCls} bench-input text-xs py-1`} placeholder="Sub location" value={draft.location2} onChange={(e) => setDraft((d) => ({ ...d, location2: e.target.value }))} />
      </div>
      <div className="flex gap-1">
        <button onClick={() => {
          updatePart(part.id, { variants: part.variants.map((v) => v.id === variant.id ? { ...v, units: [...(v.units || []), { id: uid(), location: draft.location.trim(), location2: draft.location2.trim(), allocatedBuildId: null }] } : v) });
          setShow(false);
          setDraft({ location: part.location || "", location2: part.location2 || "" });
        }} className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}><Check size={10} /> Add</button>
        <button onClick={() => setShow(false)} className="px-2 py-0.5 text-[11px] rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- PARTS TAB ----
function PartsTab({ parts, showAddPart, setShowAddPart, newPart, setNewPart, addPart, deletePart, adjustQty, updatePart, updateSerial, addSerial, removeSerial, builds, subbuilds, isAdmin }) {
  const allBuildsAndSubbuilds = [...(builds || []), ...(subbuilds || [])];
  const [expanded, setExpanded] = useState({});
  const [serialDraft, setSerialDraft] = useState({});
  const [editingPartId, setEditingPartId] = useState(null);
  const [editingSerialId, setEditingSerialId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTags, setFilterTags] = useState([]);

  const handleSaveEdit = async (id, updates) => { await updatePart(id, updates); setEditingPartId(null); };

  const allCategories = [...new Set(parts.map((p) => p.category).filter(Boolean))].sort();
  const allTags = [...new Set(parts.flatMap((p) => p.tags || []))].sort();

  const filteredParts = parts.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterTags.length > 0 && !filterTags.some((t) => (p.tags || []).includes(t))) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm" style={{ color: "#8FA39A" }}>{filteredParts.length} part{filteredParts.length === 1 ? "" : "s"}{(filterCategory || filterTags.length > 0) ? ` (filtered)` : ""}</h2>
        {isAdmin && <button onClick={() => setShowAddPart((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#5FB88A" }}>
          <Plus size={13} /> Add part
        </button>}
      </div>

      {/* Filters */}
      {(allCategories.length > 0 || allTags.length > 0) && (
        <div className="flex flex-col gap-2 mb-4 p-3 rounded" style={{ background: "#141F1B", border: "1px solid #233029" }}>
          {allCategories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: "#5C6E66" }}>Category</span>
              <button
                onClick={() => setFilterCategory("")}
                className="text-[11px] px-2 py-0.5 rounded"
                style={{ background: !filterCategory ? "#5FB88A" : "#1B2622", color: !filterCategory ? "#0F1714" : "#8FA39A", border: "1px solid #2A3A33", fontWeight: !filterCategory ? 600 : 400 }}
              >
                All
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: filterCategory === cat ? "#5FB88A" : "#1B2622", color: filterCategory === cat ? "#0F1714" : "#8FA39A", border: "1px solid #2A3A33", fontWeight: filterCategory === cat ? 600 : 400 }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider shrink-0" style={{ color: "#5C6E66" }}>Tags</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                  className="text-[11px] px-2 py-0.5 rounded"
                  style={{ background: filterTags.includes(tag) ? "#D98A4B" : "#1B2622", color: filterTags.includes(tag) ? "#0F1714" : "#8FA39A", border: "1px solid #2A3A33", fontWeight: filterTags.includes(tag) ? 600 : 400 }}
                >
                  {tag}
                </button>
              ))}
              {filterTags.length > 0 && (
                <button onClick={() => setFilterTags([])} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "#6B8077" }}>
                  clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showAddPart && (
        <div className="bench-card rounded p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input autoFocus className={`${inputCls} bench-input`} placeholder="e.g. WOW2 Indicator" value={newPart.name} onChange={(e) => setNewPart((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Category (optional)"><input className={`${inputCls} bench-input`} placeholder="e.g. WoW Tech" value={newPart.category} onChange={(e) => setNewPart((p) => ({ ...p, category: e.target.value }))} /></Field>
            <Field label="Primary Location"><input className={`${inputCls} bench-input`} placeholder="e.g. CCWF" value={newPart.location} onChange={(e) => setNewPart((p) => ({ ...p, location: e.target.value }))} /></Field>
            <Field label="Sub Location"><input className={`${inputCls} bench-input`} placeholder="e.g. Lab" value={newPart.location2} onChange={(e) => setNewPart((p) => ({ ...p, location2: e.target.value }))} /></Field>
            {!newPart.serialized && <Field label="Quantity"><input type="number" min="0" className={`${inputCls} bench-input`} value={newPart.qty} onChange={(e) => setNewPart((p) => ({ ...p, qty: e.target.value }))} /></Field>}
          </div>
          <div className="mt-3">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "#8FA39A" }}>Tags</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(newPart.tags || []).map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded" style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#5FB88A" }}>
                  {tag}
                  <button onClick={() => setNewPart((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))} style={{ color: "#6B8077" }}><X size={10} /></button>
                </span>
              ))}
              <input
                placeholder="Add tag…"
                className="text-[11px] bg-transparent outline-none border-b py-0.5"
                style={{ color: "#EAF0EC", borderColor: "#2A3A33", width: "100px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    const tag = e.target.value.trim();
                    if (!newPart.tags.includes(tag)) setNewPart((p) => ({ ...p, tags: [...p.tags, tag] }));
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer select-none" style={{ color: "#8FA39A" }}>
            <input type="checkbox" checked={newPart.has_variants} onChange={(e) => setNewPart((p) => ({ ...p, has_variants: e.target.checked, serialized: false }))} style={{ accentColor: "#D98A4B" }} />
            This part has variants (e.g. RAM, amperage etc.)
          </label>
          {newPart.has_variants && (
            <div className="mt-2">
              <Field label="Variant names (one per line, or comma-separated)">
                <textarea className={`${inputCls} bench-input`} rows={3} placeholder={"1GB RAM\n4GB RAM\n8GB RAM"} value={newPart.variantsText} onChange={(e) => setNewPart((p) => ({ ...p, variantsText: e.target.value }))} />
              </Field>
              <p className="text-[10px] mt-1" style={{ color: "#6B8077" }}>
                {newPart.variantsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length} variants — you can set quantities and add more after saving.
              </p>
            </div>
          )}
          {!newPart.has_variants && (
          <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer select-none" style={{ color: "#8FA39A" }}>
            <input type="checkbox" checked={newPart.serialized} onChange={(e) => setNewPart((p) => ({ ...p, serialized: e.target.checked }))} style={{ accentColor: "#D98A4B" }} />
            This part has individual serial numbers
          </label>
          )}
          {newPart.serialized && !newPart.has_variants && (
            <div className="mt-2">
              <Field label="Serial numbers (one per line, or comma-separated)">
                <textarea className={`${inputCls} bench-input`} rows={3} placeholder={"SN-001\nSN-002"} value={newPart.serialsText} onChange={(e) => setNewPart((p) => ({ ...p, serialsText: e.target.value }))} />
              </Field>
              <p className="text-[10px] mt-1" style={{ color: "#6B8077" }}>
                {newPart.serialsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length} serials — all inherit the locations above. You can change individual ones after saving.
              </p>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={addPart} className="px-3 py-1.5 text-xs rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}>Save part</button>
            <button onClick={() => setShowAddPart(false)} className="px-3 py-1.5 text-xs rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
          </div>
        </div>
      )}

      {parts.length === 0 && !showAddPart && (
        <div className="bench-card rounded p-6 text-center">
          <p className="text-sm" style={{ color: "#8FA39A" }}>No parts yet. Add your first one to start tracking the lab.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filteredParts.map((part) => {
          const avail = availableQty(part);
          const used = allocatedQty(part);
          const total = totalQty(part);
          const isOpen = expanded[part.id] === undefined ? true : !!expanded[part.id];
          const isEditing = editingPartId === part.id;

          return (
            <div key={part.id} className="bench-card rounded p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="mt-1.5"><StatusDot part={part} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{part.name}</span>
                      {part.category && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1B2622", color: "#5FB88A" }}>{part.category}</span>}
                    </div>
                    <div className="text-xs mt-1">
                      <span style={{ color: avail === 0 ? "#E0664C" : "#5FB88A" }}>{avail} available</span>
                      <span style={{ color: "#8FA39A" }}> · {total} total</span>
                      {used > 0 && <span style={{ color: avail === 0 ? "#E0664C" : "#D98A4B" }}> · {used} allocated</span>}
                    </div>
                    {/* Variants display */}
                    {part.has_variants && (
                      <div className="mt-2 flex flex-col gap-2">
                        {(part.variants || []).map((v) => {
                          const vAvail = variantAvailableQty(v);
                          const vTotal = (v.units || []).length;
                          return (
                            <div key={v.id} className="pl-2 border-l" style={{ borderColor: "#233029" }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-semibold" style={{ color: "#EAF0EC" }}>{v.name}</span>
                                <span className="text-[10px]" style={{ color: vAvail === 0 && vTotal > 0 ? "#E0664C" : vAvail === vTotal ? "#5FB88A" : "#D98A4B" }}>
                                  {vAvail} free · {vTotal} total
                                </span>
                              </div>
                              {(() => {
                                const locGroups = {};
                                for (const u of (v.units || [])) {
                                  const locKey = `${u.location || ""}|||${u.location2 || ""}`;
                                  if (!locGroups[locKey]) locGroups[locKey] = { location: u.location || "", location2: u.location2 || "", units: [] };
                                  locGroups[locKey].units.push(u);
                                }
                                return Object.values(locGroups).map((group, gi) => {
                                  const buildGroups = {};
                                  for (const u of group.units) {
                                    const bKey = u.allocatedBuildId || "__free__";
                                    if (!buildGroups[bKey]) buildGroups[bKey] = { buildId: u.allocatedBuildId, units: [] };
                                    buildGroups[bKey].units.push(u);
                                  }
                                  return (
                                    <div key={gi} className="pl-2 mb-1">
                                      {(group.location || group.location2) && (
                                        <div className="flex items-center gap-1 mb-1">
                                          <MapPin size={10} color="#6B8077" />
                                          <span className="text-[10px]" style={{ color: "#8FA39A" }}>{group.location}{group.location2 ? ` · ${group.location2}` : ""}</span>
                                        </div>
                                      )}
                                      {Object.values(buildGroups).map((bg, bgi) => {
                                        const b = bg.buildId ? allBuildsAndSubbuilds.find((bd) => bd.id === bg.buildId) : null;
                                        return (
                                          <div key={bgi} className="pl-2">
                                            {b && <div className="text-[10px] mb-0.5" style={{ color: "#D98A4B" }}>in {b.name}</div>}
                                            <div className="flex items-center justify-between gap-2 text-[11px]">
                                              <span className="flex items-center gap-1.5">
                                                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: bg.buildId ? "#D98A4B" : "#5FB88A" }} />
                                                <span style={{ color: "#8FA39A" }}>{v.name}{bg.units.length > 1 ? ` ×${bg.units.length}` : ""}</span>
                                              </span>
                                              {!bg.buildId && (
                                                <button onClick={() => updatePart(part.id, { variants: part.variants.map((x) => x.id === v.id ? { ...x, units: x.units.filter((y) => y.id !== bg.units[bg.units.length - 1].id) } : x) })} style={{ color: "#E0664C" }} className="w-4 h-4 flex items-center justify-center"><X size={10} /></button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                });
                              })()}
                              <div className="flex items-center gap-1 mt-1">
                                <button onClick={() => updatePart(part.id, { variants: part.variants.map((x) => x.id === v.id ? { ...x, units: [...(x.units || []), { id: uid(), location: part.location || "", location2: part.location2 || "", allocatedBuildId: null }] } : x) })} className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>+</button>
                                <button onClick={() => { const freeUnit = [...(v.units || [])].reverse().find((u) => !u.allocatedBuildId); if (freeUnit) updatePart(part.id, { variants: part.variants.map((x) => x.id === v.id ? { ...x, units: x.units.filter((u) => u.id !== freeUnit.id) } : x) }); }} className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>−</button>
              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-1.5 mt-1 pl-2">
                          <input
                            placeholder="New variant name…"
                            className="text-[11px] bg-transparent outline-none border-b py-0.5"
                            style={{ color: "#EAF0EC", borderColor: "#2A3A33", width: "150px" }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.target.value.trim()) {
                                updatePart(part.id, { variants: [...(part.variants || []), { id: uid(), name: e.target.value.trim(), units: [] }] });
                                e.target.value = "";
                              }
                            }}
                          />
                          <Plus size={11} color="#5FB88A" />
                        </div>
                      </div>
                    )}

                    {/* Smart location display */}
                    {part.serialized ? (
                      used === 0 && <LocationDisplay location={part.location} location2={part.location2} />
                    ) : used === 0 ? (
                      <LocationDisplay location={part.location} location2={part.location2} />
                    ) : (
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {(() => {
                          const groups = {};
                          for (const a of (part.allocations || [])) {
                            const loc = a.location || part.location || "";
                            const loc2 = a.location2 || part.location2 || "";
                            const key = `${loc}|||${loc2}`;
                            if (!groups[key]) groups[key] = { location: loc, location2: loc2, allocatedQty: 0, buildNames: [] };
                            groups[key].allocatedQty += a.qty;
                            const b = allBuildsAndSubbuilds.find((bd) => bd.id === a.buildId);
                            groups[key].buildNames.push(b ? b.name : "(deleted)");
                          }
                          if (avail > 0) {
                            const loc = part.location || "";
                            const loc2 = part.location2 || "";
                            const key = `${loc}|||${loc2}`;
                            if (!groups[key]) groups[key] = { location: loc, location2: loc2, allocatedQty: 0, buildNames: [] };
                            groups[key].freeQty = avail;
                          }
                          return Object.values(groups).map((g, i) => (
                            <div key={i} className="text-[11px]">
                              <div className="flex items-center gap-1">
                                <MapPin size={11} color="#6B8077" />
                                <span style={{ color: "#8FA39A" }}>{g.location}{g.location2 ? ` · ${g.location2}` : ""}</span>
                              </div>
                              {g.freeQty > 0 && <div className="pl-4 text-[10px]" style={{ color: "#5FB88A" }}>↳ {g.freeQty} available</div>}
                              {g.allocatedQty > 0 && <div className="pl-4 text-[10px]" style={{ color: "#D98A4B" }}>↳ {g.allocatedQty} in {g.buildNames.join(", ")}</div>}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* Edit form */}
                    {isEditing && (
                      <EditPartForm part={part} usedQty={used} onSave={(updates) => handleSaveEdit(part.id, updates)} onCancel={() => setEditingPartId(null)} />
                    )}

                    {/* Serials */}
                    {part.serialized && !isEditing && (
                      <div className="mt-2">
                        <button onClick={() => setExpanded((e) => ({ ...e, [part.id]: !e[part.id] }))} className="flex items-center gap-1 text-[11px]" style={{ color: "#5FB88A" }}>
                          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isOpen ? `Hide serials` : `Show ${total} serial${total === 1 ? "" : "s"}`}
                        </button>
                        {isOpen && (
                          <div className="mt-2 flex flex-col gap-3 pl-1 border-l" style={{ borderColor: "#233029" }}>
                            {(() => {
                              // Group serials by location
                              const locGroups = {};
                              for (const s of (part.serials || [])) {
                                const locKey = `${s.location || ""}|||${s.location2 || ""}`;
                                if (!locGroups[locKey]) locGroups[locKey] = { location: s.location || "", location2: s.location2 || "", serials: [] };
                                locGroups[locKey].serials.push(s);
                              }
                              return Object.values(locGroups).map((group, gi) => {
                                // Within each location group, group by build
                                const buildGroups = {};
                                for (const s of group.serials) {
                                  const bKey = s.allocatedBuildId || "__free__";
                                  if (!buildGroups[bKey]) buildGroups[bKey] = { buildId: s.allocatedBuildId, serials: [] };
                                  buildGroups[bKey].serials.push(s);
                                }
                                return (
                                  <div key={gi} className="pl-2">
                                    {(group.location || group.location2) && (
                                      <div className="flex items-center gap-1 mb-1.5">
                                        <MapPin size={11} color="#6B8077" />
                                        <span className="text-[10px]" style={{ color: "#8FA39A" }}>
                                          {group.location}{group.location2 ? ` · ${group.location2}` : ""}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex flex-col gap-2 pl-2">
                                      {Object.values(buildGroups).map((bg, bgi) => {
                                        const b = bg.buildId ? allBuildsAndSubbuilds.find((bd) => bd.id === bg.buildId) : null;
                                        return (
                                          <div key={bgi}>
                                            {b && <div className="text-[10px] mb-1" style={{ color: "#D98A4B" }}>in {b.name}</div>}
                                            <div className="flex flex-col gap-1">
                                              {bg.serials.map((s) => {
                                                const isEditingSerial = editingSerialId === s.id;
                                                return (
                                                  <div key={s.id} className="flex flex-col gap-0.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <span className="flex items-center gap-1.5 text-[11px]">
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.allocatedBuildId ? "#D98A4B" : "#5FB88A" }} />
                                                        <span style={{ color: "#EAF0EC" }}>{s.serial}</span>
                                                      </span>
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => setEditingSerialId(isEditingSerial ? null : s.id)} className="w-5 h-5 rounded flex items-center justify-center" style={{ color: isEditingSerial ? "#5FB88A" : "#6B8077", border: "1px solid #2A3A33" }} title="Edit location">
                                                          <Pencil size={10} />
                                                        </button>
                                                        {!s.allocatedBuildId && (
                                                          <button onClick={() => removeSerial(part.id, s.id)} style={{ color: "#E0664C" }} className="w-5 h-5 flex items-center justify-center"><X size={11} /></button>
                                                        )}
                                                      </div>
                                                    </div>
                                                    {isEditingSerial && (
                                                      <EditSerialLocation serial={s} onSave={async (updates) => { await updateSerial(part.id, s.id, updates); setEditingSerialId(null); }} onCancel={() => setEditingSerialId(null)} />
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                            {/* Add new serial */}
                            <div className="flex items-center gap-1.5 pl-2">
                              <input
                                value={serialDraft[part.id] || ""}
                                onChange={(e) => setSerialDraft((d) => ({ ...d, [part.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") { addSerial(part.id, serialDraft[part.id] || "", part.location, part.location2); setSerialDraft((d) => ({ ...d, [part.id]: "" })); } }}
                                placeholder="New serial…"
                                className="text-[11px] bg-transparent outline-none border-b py-0.5"
                                style={{ color: "#EAF0EC", borderColor: "#2A3A33", width: "140px" }}
                              />
                              <button onClick={() => { addSerial(part.id, serialDraft[part.id] || "", part.location, part.location2); setSerialDraft((d) => ({ ...d, [part.id]: "" })); }} style={{ color: "#5FB88A" }}>
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-2 shrink-0 self-stretch">
                  <div className="flex items-center gap-1.5">
                  {!part.serialized && !part.has_variants && (
                    <>
                      <button onClick={() => adjustQty(part.id, -1)} className="w-6 h-6 rounded text-xs flex items-center justify-center" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>−</button>
                      <span className="text-xs w-5 text-center">{part.qty}</span>
                      <button onClick={() => adjustQty(part.id, 1)} className="w-6 h-6 rounded text-xs flex items-center justify-center" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>+</button>
                    </>
                  )}
                  {isAdmin && <button onClick={() => setEditingPartId(isEditing ? null : part.id)} className="w-6 h-6 rounded flex items-center justify-center ml-1" style={{ color: isEditing ? "#5FB88A" : "#8FA39A", border: "1px solid #2A3A33" }} title="Edit part">
                    <Pencil size={12} />
                  </button>}
                  {isAdmin && <button onClick={() => deletePart(part.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: "#E0664C" }}>
                    <Trash2 size={13} />
                  </button>}
                  </div>
                  {(part.tags || []).length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1">
                      {(part.tags || []).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1B2622", color: "#8FA39A", border: "1px solid #233029" }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- SUB-BUILDS TAB ----
function SubBuildsTab({ subbuilds, parts, partsById, builds, showAddSubBuild, setShowAddSubBuild, newSubBuild, setNewSubBuild, subBuildLines, addSubBuildLine, removeSubBuildLine, updateSubBuildLine, toggleSubBuildLineSerial, createSubBuild, subBuildError, disassembleSubBuild, updateSubBuild, isAdmin }) {
  const [editingId, setEditingId] = useState(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm" style={{ color: "#8FA39A" }}>{subbuilds.length} sub-build{subbuilds.length === 1 ? "" : "s"}</h2>
        {isAdmin && <button onClick={() => setShowAddSubBuild((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#5FB88A" }}>
          <Plus size={13} /> New sub-build
        </button>}
      </div>
      {showAddSubBuild && (
        <div className="bench-card rounded p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Sub-build name"><input autoFocus className={`${inputCls} bench-input`} placeholder="e.g. RPi Box 101" value={newSubBuild.name} onChange={(e) => setNewSubBuild((b) => ({ ...b, name: e.target.value }))} /></Field>
            <div />
            <Field label="Primary Location"><input className={`${inputCls} bench-input`} placeholder="e.g. CCWF" value={newSubBuild.location} onChange={(e) => setNewSubBuild((b) => ({ ...b, location: e.target.value }))} /></Field>
            <Field label="Sub Location"><input className={`${inputCls} bench-input`} placeholder="e.g. Lab" value={newSubBuild.location2} onChange={(e) => setNewSubBuild((b) => ({ ...b, location2: e.target.value }))} /></Field>
          </div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8FA39A" }}>Parts</div>
          <div className="flex flex-col gap-2">
            {subBuildLines.map((line) => {
              const selected = partsById[line.partId];
              const avail = selected ? availableQty(selected) : null;
              return (
                <div key={line.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <select value={line.partId} onChange={(e) => updateSubBuildLine(line.id, "partId", e.target.value)} className={`${inputCls} bench-input flex-1`}>
                      <option value="">Select part…</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id} disabled={availableQty(p) <= 0}>
                          {p.name} ({availableQty(p)} free){p.serialized ? " — serialized" : ""}
                        </option>
                      ))}
                    </select>
                    {selected && !selected.serialized && !selected.has_variants && (
                      <input type="number" min="1" max={avail ?? undefined} value={line.qty} onChange={(e) => updateSubBuildLine(line.id, "qty", e.target.value)} className={`${inputCls} bench-input w-16`} />
                    )}
                    <button onClick={() => removeSubBuildLine(line.id)} style={{ color: "#6B8077" }}><X size={14} /></button>
                  </div>
                  {selected && selected.has_variants && (
                    <div className="ml-1 pl-2 flex flex-col gap-2 border-l" style={{ borderColor: "#233029" }}>
                      <span className="text-[10px]" style={{ color: "#6B8077" }}>Pick units ({(line.unitIds || []).length} selected)</span>
                      {(selected.variants || []).filter((v) => variantAvailableQty(v) > 0).map((v) => {
                        const freeUnits = (v.units || []).filter((u) => !u.allocatedBuildId);
                        return (
                          <div key={v.id}>
                            <div className="text-[11px] font-semibold mb-1" style={{ color: "#EAF0EC" }}>{v.name} ({variantAvailableQty(v)} free)</div>
                            {freeUnits.map((u) => (
                              <label key={u.id} className="flex items-center gap-2 text-[11px] cursor-pointer mb-0.5" style={{ color: "#8FA39A" }}>
                                <input type="checkbox" checked={line.variantId === v.id && (line.unitIds || []).includes(u.id)}
                                  onChange={() => { updateSubBuildLine(line.id, "variantId", v.id); const current = line.variantId === v.id ? (line.unitIds || []) : []; const newUnitIds = current.includes(u.id) ? current.filter((x) => x !== u.id) : [...current, u.id]; updateSubBuildLine(line.id, "unitIds", newUnitIds); }}
                                  style={{ accentColor: "#D98A4B" }} />
                                {u.location || "No location"}{u.location2 ? ` · ${u.location2}` : ""}
                              </label>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selected && selected.serialized && (
                    <div className="ml-1 pl-2 flex flex-col gap-1 border-l" style={{ borderColor: "#233029" }}>
                      <span className="text-[10px]" style={{ color: "#6B8077" }}>Pick specific units ({line.serialIds.length} selected)</span>
                      {(selected.serials || []).filter((s) => !s.allocatedBuildId).map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "#EAF0EC" }}>
                          <input type="checkbox" checked={line.serialIds.includes(s.id)} onChange={() => toggleSubBuildLineSerial(line.id, s.id)} style={{ accentColor: "#D98A4B" }} />
                          {s.serial}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={addSubBuildLine} className="text-xs mt-2 flex items-center gap-1" style={{ color: "#5FB88A" }}><Plus size={12} /> Add another part</button>
          {subBuildError && <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "#E0664C" }}><AlertCircle size={13} />{subBuildError}</div>}
          <div className="flex gap-2 mt-4">
            <button onClick={createSubBuild} className="px-3 py-1.5 text-xs rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}>Create sub-build</button>
            <button onClick={() => setShowAddSubBuild(false)} className="px-3 py-1.5 text-xs rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
          </div>
        </div>
      )}
      {subbuilds.length === 0 && !showAddSubBuild && (
        <div className="bench-card rounded p-6 text-center">
          <p className="text-sm" style={{ color: "#8FA39A" }}>No sub-builds yet. Create one from parts to slot into a main build.</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {subbuilds.map((subbuild) => {
          const isEditing = editingId === subbuild.id;
          const parentBuild = subbuild.allocated_build_id ? builds.find((b) => b.id === subbuild.allocated_build_id) : null;
          return (
            <div key={subbuild.id} className="bench-card rounded p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Package size={13} color="#5FB88A" />
                    <span className="text-sm font-semibold">{subbuild.name}</span>
                    {parentBuild
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1B2622", color: "#D98A4B" }}>in {parentBuild.name}</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1B2622", color: "#5FB88A" }}>free</span>
                    }
                  </div>
                  <LocationDisplay location={subbuild.location} location2={subbuild.location2} />
                  <div className="mt-2 flex flex-col gap-0.5">
                    {(subbuild.lines || []).sort((a, b) => (partsById[a.partId]?.name || "").localeCompare(partsById[b.partId]?.name || "", undefined, { numeric: true })).map((line) => {
                      const part = partsById[line.partId];
                      const variantName = line.variantId && part ? part.variants?.find((v) => v.id === line.variantId)?.name : null;
                      const serialNames = line.serialIds && part ? line.serialIds.map((sid) => part.serials?.find((s) => s.id === sid)?.serial).filter(Boolean) : null;
                      return (
                        <span key={`${line.partId}-${line.variantId || ""}`} className="text-[11px]" style={{ color: "#6B8077" }}>
                          ↳ {line.qty}× {part ? part.name : "(deleted)"}
                          {variantName && <span style={{ color: "#8FA39A" }}> — {variantName}</span>}
                          {serialNames && serialNames.length > 0 && <span style={{ color: "#8FA39A" }}> (SN: {serialNames.join(", ")})</span>}
                        </span>
                      );
                    })}
                  </div>
                  {isEditing && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "#233029" }}>
                      <EditSubBuildForm subbuild={subbuild} onSave={async (updates) => { await updateSubBuild(subbuild.id, updates); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                    </div>
                  )}
                </div>
                {isAdmin && !subbuild.allocated_build_id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setEditingId(isEditing ? null : subbuild.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: isEditing ? "#5FB88A" : "#8FA39A", border: "1px solid #2A3A33" }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => disassembleSubBuild(subbuild.id)} className="px-2.5 py-1 text-[11px] rounded" style={{ border: "1px solid #2A3A33", color: "#E0664C" }}>Disassemble</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditSubBuildForm({ subbuild, onSave, onCancel }) {
  const [draft, setDraft] = useState({ name: subbuild.name, location: subbuild.location || "", location2: subbuild.location2 || "" });
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Name"><input autoFocus className={`${inputCls} bench-input`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
      <div />
      <Field label="Primary Location"><input className={`${inputCls} bench-input`} value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} /></Field>
      <Field label="Sub Location"><input className={`${inputCls} bench-input`} value={draft.location2} onChange={(e) => setDraft((d) => ({ ...d, location2: e.target.value }))} /></Field>
      <div className="col-span-2 flex gap-2 mt-1">
        <button onClick={() => onSave({ name: draft.name.trim(), location: draft.location.trim() || "Lab", location2: draft.location2.trim() })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}><Check size={12} /> Save</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- EDIT BUILD FORM ----
function EditBuildForm({ build, onSave, onCancel, parts, partsById, subbuildsById, removePartFromBuild, addPartToBuild, removeSubbuildFromMainBuild }) {
  const [draft, setDraft] = useState({ name: build.name, location: build.location || "", location2: build.location2 || "" });
  const [addLine, setAddLine] = useState({ partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] });
  const [showAdd, setShowAdd] = useState(false);
  const save = () => { if (!draft.name.trim()) return; onSave({ name: draft.name.trim(), location: draft.location.trim() || "Lab", location2: draft.location2.trim() }); };
  const selectedPart = partsById[addLine.partId];
  const handleAddPart = async () => {
    if (!addLine.partId) return;
    const part = partsById[addLine.partId];
    if (!part) return;
    if (part.has_variants) {
      await addPartToBuild(build.id, addLine.partId, addLine.unitIds.length, [], addLine.variantId, addLine.unitIds);
    } else {
      await addPartToBuild(build.id, addLine.partId, part.serialized ? addLine.serialIds.length : parseInt(addLine.qty, 10) || 0, part.serialized ? addLine.serialIds : [], "", []);
    }
    setAddLine({ partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] });
    setShowAdd(false);
  };
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "#233029" }}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Build Name"><input autoFocus className={`${inputCls} bench-input`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
        <div />
        <Field label="Primary Location"><input className={`${inputCls} bench-input`} value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} placeholder="e.g. Feedlot A" /></Field>
        <Field label="Sub Location"><input className={`${inputCls} bench-input`} value={draft.location2} onChange={(e) => setDraft((d) => ({ ...d, location2: e.target.value }))} placeholder="e.g. Pen 3" /></Field>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#D98A4B", color: "#0F1714", fontWeight: 600 }}><Check size={12} /> Save details</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Done</button>
      </div>

      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#233029" }}>
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8FA39A" }}>Parts in this build</div>
        <div className="flex flex-col gap-1.5">
          {[...build.lines].sort((a, b) => {
            const nameA = a.subbuildId ? (subbuildsById?.[a.subbuildId]?.name || "") : (partsById[a.partId]?.name || "");
            const nameB = b.subbuildId ? (subbuildsById?.[b.subbuildId]?.name || "") : (partsById[b.partId]?.name || "");
            return nameA.localeCompare(nameB, undefined, { numeric: true });
          }).map((line) => {
            if (line.subbuildId) {
              const sb = subbuildsById?.[line.subbuildId];
              return (
                <div key={line.subbuildId} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded" style={{ background: "#1B2622" }}>
                  <span className="flex items-center gap-1.5" style={{ color: "#EAF0EC" }}>
                    <Package size={10} color="#5FB88A" />
                    {sb ? sb.name : "(deleted sub-build)"}
                  </span>
                  <button onClick={() => removeSubbuildFromMainBuild(build.id, line.subbuildId)} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ border: "1px solid #2A3A33", color: "#E0664C" }}>
                    <X size={10} /> Remove
                  </button>
                </div>
              );
            }
            const part = partsById[line.partId];
            return (
              <div key={line.partId} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded" style={{ background: "#1B2622" }}>
                <span style={{ color: "#EAF0EC" }}>
                  {line.qty}× {part ? part.name : "(deleted)"}
                  {line.serialIds?.length > 0 && <span style={{ color: "#8FA39A" }}> (SN: {line.serialIds.map((sid) => part?.serials?.find((s) => s.id === sid)?.serial).filter(Boolean).join(", ")})</span>}
                </span>
                <button onClick={() => removePartFromBuild(build.id, line.partId, line.serialIds || [])} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ border: "1px solid #2A3A33", color: "#E0664C" }}>
                  <X size={10} /> Remove
                </button>
              </div>
            );
          })}
        </div>
        {showAdd ? (
          <div className="mt-2 flex flex-col gap-2">
            <select value={addLine.partId} onChange={(e) => setAddLine((l) => ({ ...l, partId: e.target.value, serialIds: [] }))} className={`${inputCls} bench-input text-xs`}>
              <option value="">Select part to add…</option>
              {parts.filter((p) => availableQty(p) > 0).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({availableQty(p)} free){p.serialized ? " — serialized" : ""}</option>
              ))}
            </select>
            {selectedPart && !selectedPart.serialized && !selectedPart.has_variants && (
              <input type="number" min="1" max={availableQty(selectedPart)} value={addLine.qty} onChange={(e) => setAddLine((l) => ({ ...l, qty: e.target.value }))} className={`${inputCls} bench-input text-xs w-20`} placeholder="qty" />
            )}
            {selectedPart && selectedPart.has_variants && (
              <div className="flex flex-col gap-2 pl-2 border-l" style={{ borderColor: "#233029" }}>
                <span className="text-[10px]" style={{ color: "#6B8077" }}>Pick units ({(addLine.unitIds || []).length} selected)</span>
                {(selectedPart.variants || []).filter((v) => variantAvailableQty(v) > 0).map((v) => {
                  const freeUnits = (v.units || []).filter((u) => !u.allocatedBuildId);
                  return (
                    <div key={v.id}>
                      <div className="text-[11px] font-semibold mb-1" style={{ color: "#EAF0EC" }}>{v.name} ({variantAvailableQty(v)} free)</div>
                      {freeUnits.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-[11px] cursor-pointer mb-0.5" style={{ color: "#8FA39A" }}>
                          <input type="checkbox"
                            checked={addLine.variantId === v.id && (addLine.unitIds || []).includes(u.id)}
                            onChange={() => setAddLine((l) => ({
                              ...l, variantId: v.id,
                              unitIds: (l.variantId === v.id ? l.unitIds || [] : []).includes(u.id)
                                ? (l.variantId === v.id ? l.unitIds || [] : []).filter((x) => x !== u.id)
                                : [...(l.variantId === v.id ? l.unitIds || [] : []), u.id]
                            }))}
                            style={{ accentColor: "#D98A4B" }}
                          />
                          {u.location || "No location"}{u.location2 ? ` · ${u.location2}` : ""}
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedPart && selectedPart.serialized && (
              <div className="flex flex-col gap-1 pl-2 border-l" style={{ borderColor: "#233029" }}>
                <span className="text-[10px]" style={{ color: "#6B8077" }}>Pick units ({addLine.serialIds.length} selected)</span>
                {(selectedPart.serials || []).filter((s) => !s.allocatedBuildId).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "#EAF0EC" }}>
                    <input type="checkbox" checked={addLine.serialIds.includes(s.id)} onChange={() => setAddLine((l) => ({ ...l, serialIds: l.serialIds.includes(s.id) ? l.serialIds.filter((x) => x !== s.id) : [...l.serialIds, s.id] }))} style={{ accentColor: "#D98A4B" }} />
                    {s.serial}
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <button onClick={handleAddPart} className="flex items-center gap-1 px-2 py-1 text-[11px] rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}><Plus size={10} /> Add</button>
              <button onClick={() => { setShowAdd(false); setAddLine({ partId: "", qty: "1", serialIds: [], variantId: "", unitIds: [] }); }} className="px-2 py-1 text-[11px] rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-[11px] mt-2" style={{ color: "#5FB88A" }}><Plus size={11} /> Add part to build</button>
        )}
      </div>
    </div>
  );
}

// ---- BUILDS TAB ----
function BuildsTab({ builds, parts, partsById, subbuilds, subbuildsById, subbuildSelections, setSubbuildSelections, showAddBuild, setShowAddBuild, newBuild, setNewBuild, buildLines, addBuildLine, removeBuildLine, updateBuildLine, toggleBuildLineSerial, createBuild, buildError, disassembleBuild, updateBuild, removePartFromBuild, addPartToBuild, addSubbuildToMainBuild, removeSubbuildFromMainBuild, isAdmin }) {
  const [editingId, setEditingId] = useState(null);
  const freeSubbuilds = (subbuilds || []).filter((s) => !s.allocated_build_id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm" style={{ color: "#8FA39A" }}>{builds.length} build{builds.length === 1 ? "" : "s"}</h2>
        {isAdmin && <button onClick={() => setShowAddBuild((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#D98A4B" }}>
          <Plus size={13} /> New build
        </button>}
      </div>

      {showAddBuild && (
        <div className="bench-card rounded p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Build name"><input autoFocus className={`${inputCls} bench-input`} placeholder="e.g. WoW Unit 01" value={newBuild.name} onChange={(e) => setNewBuild((b) => ({ ...b, name: e.target.value }))} /></Field>
            <div />
            <Field label="Primary Location"><input className={`${inputCls} bench-input`} placeholder="e.g. Feedlot A" value={newBuild.location} onChange={(e) => setNewBuild((b) => ({ ...b, location: e.target.value }))} /></Field>
            <Field label="Sub Location"><input className={`${inputCls} bench-input`} placeholder="e.g. Pen 3" value={newBuild.location2} onChange={(e) => setNewBuild((b) => ({ ...b, location2: e.target.value }))} /></Field>
          </div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8FA39A" }}>Parts used</div>
          <div className="flex flex-col gap-2">
            {buildLines.map((line) => {
              const selected = partsById[line.partId];
              const avail = selected ? availableQty(selected) : null;
              return (
                <div key={line.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <select value={line.partId} onChange={(e) => updateBuildLine(line.id, "partId", e.target.value)} className={`${inputCls} bench-input flex-1`}>
                      <option value="">Select part…</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id} disabled={availableQty(p) <= 0}>
                          {p.name} ({availableQty(p)} free){p.serialized ? " — serialized" : ""}
                        </option>
                      ))}
                    </select>
                    {selected && !selected.serialized && !selected.has_variants && (
                      <input type="number" min="1" max={avail ?? undefined} value={line.qty} onChange={(e) => updateBuildLine(line.id, "qty", e.target.value)} className={`${inputCls} bench-input w-16`} />
                    )}
                    <button onClick={() => removeBuildLine(line.id)} style={{ color: "#6B8077" }}><X size={14} /></button>
                  </div>
                  {selected && selected.has_variants && (
                    <div className="ml-1 pl-2 flex flex-col gap-2 border-l" style={{ borderColor: "#233029" }}>
                      <span className="text-[10px]" style={{ color: "#6B8077" }}>Pick units ({(line.unitIds || []).length} selected)</span>
                      {(selected.variants || []).filter((v) => variantAvailableQty(v) > 0).map((v) => {
                        const freeUnits = (v.units || []).filter((u) => !u.allocatedBuildId);
                        return (
                          <div key={v.id}>
                            <div className="text-[11px] font-semibold mb-1" style={{ color: "#EAF0EC" }}>{v.name} ({variantAvailableQty(v)} free)</div>
                            {freeUnits.map((u) => (
                              <label key={u.id} className="flex items-center gap-2 text-[11px] cursor-pointer mb-0.5" style={{ color: "#8FA39A" }}>
                                <input type="checkbox"
                                  checked={line.variantId === v.id && (line.unitIds || []).includes(u.id)}
                                  onChange={() => {
                                    updateBuildLine(line.id, "variantId", v.id);
                                    const current = line.variantId === v.id ? (line.unitIds || []) : [];
                                    const newUnitIds = current.includes(u.id) ? current.filter((x) => x !== u.id) : [...current, u.id];
                                    updateBuildLine(line.id, "unitIds", newUnitIds);
                                  }}
                                  style={{ accentColor: "#D98A4B" }}
                                />
                                {u.location || "No location"}{u.location2 ? ` · ${u.location2}` : ""}
                              </label>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selected && selected.serialized && (
                    <div className="ml-1 pl-2 flex flex-col gap-1 border-l" style={{ borderColor: "#233029" }}>
                      <span className="text-[10px]" style={{ color: "#6B8077" }}>Pick specific units ({line.serialIds.length} selected)</span>
                      {(selected.serials || []).filter((s) => !s.allocatedBuildId).map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "#EAF0EC" }}>
                          <input type="checkbox" checked={line.serialIds.includes(s.id)} onChange={() => toggleBuildLineSerial(line.id, s.id)} style={{ accentColor: "#D98A4B" }} />
                          {s.serial}
                          {(s.location || s.location2) && <span style={{ color: "#5C6E66" }}>— {s.location}{s.location2 ? ` · ${s.location2}` : ""}</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={addBuildLine} className="text-xs mt-2 flex items-center gap-1" style={{ color: "#5FB88A" }}><Plus size={12} /> Add another part</button>
          {freeSubbuilds.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#233029" }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8FA39A" }}>Sub-builds</div>
              <div className="flex flex-col gap-1">
                {freeSubbuilds.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "#EAF0EC" }}>
                    <input type="checkbox" checked={subbuildSelections.includes(s.id)} onChange={() => setSubbuildSelections((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])} style={{ accentColor: "#5FB88A" }} />
                    <Package size={11} color="#5FB88A" />
                    {s.name}
                    <span style={{ color: "#5C6E66" }}>— {s.location}{s.location2 ? ` · ${s.location2}` : ""}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {buildError && <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "#E0664C" }}><AlertCircle size={13} />{buildError}</div>}
          <div className="flex gap-2 mt-4">
            <button onClick={createBuild} className="px-3 py-1.5 text-xs rounded" style={{ background: "#D98A4B", color: "#0F1714", fontWeight: 600 }}>Create build</button>
            <button onClick={() => setShowAddBuild(false)} className="px-3 py-1.5 text-xs rounded" style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}>Cancel</button>
          </div>
        </div>
      )}

      {builds.length === 0 && !showAddBuild && (
        <div className="bench-card rounded p-6 text-center">
          <p className="text-sm" style={{ color: "#8FA39A" }}>No builds yet. Group parts into a build once you've assembled something.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {builds.map((build) => {
          const isEditing = editingId === build.id;
          return (
            <div key={build.id} className="bench-card rounded p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Wrench size={13} color="#D98A4B" />
                    <span className="text-sm font-semibold">{build.name}</span>
                  </div>
                  <LocationDisplay location={build.location} location2={build.location2} />
                  <div className="mt-2 flex flex-col gap-0.5">
                    {[...build.lines].sort((a, b) => {
                      const nameA = a.subbuildId ? (subbuildsById?.[a.subbuildId]?.name || "") : (partsById[a.partId]?.name || "");
                      const nameB = b.subbuildId ? (subbuildsById?.[b.subbuildId]?.name || "") : (partsById[b.partId]?.name || "");
                      return nameA.localeCompare(nameB, undefined, { numeric: true });
                    }).map((line) => {
                      if (line.subbuildId) {
                        const sb = subbuildsById?.[line.subbuildId];
                        return (
                          <span key={line.subbuildId} className="text-[11px] flex items-center gap-1" style={{ color: "#6B8077" }}>
                            <Package size={10} color="#5FB88A" />
                            {sb ? sb.name : "(deleted sub-build)"}
                          </span>
                        );
                      }
                      const part = partsById[line.partId];
                      const serialNames = line.serialIds && part ? line.serialIds.map((sid) => part.serials?.find((s) => s.id === sid)?.serial).filter(Boolean) : null;
                      const variantName = line.variantId && part ? part.variants?.find((v) => v.id === line.variantId)?.name : null;
                      return (
                        <span key={`${line.partId}-${line.variantId || ""}`} className="text-[11px]" style={{ color: "#6B8077" }}>
                          ↳ {line.qty}× {part ? part.name : "(deleted part)"}
                          {variantName && <span style={{ color: "#8FA39A" }}> — {variantName}</span>}
                          {serialNames && serialNames.length > 0 && <span style={{ color: "#8FA39A" }}> (SN: {serialNames.join(", ")})</span>}
                        </span>
                      );
                    })}
                  </div>
                  {isEditing && (
                    <EditBuildForm build={build} onSave={async (updates) => { await updateBuild(build.id, updates); }} onCancel={() => setEditingId(null)} parts={parts} partsById={partsById} subbuildsById={subbuildsById} removePartFromBuild={removePartFromBuild} addPartToBuild={addPartToBuild} removeSubbuildFromMainBuild={removeSubbuildFromMainBuild} />
                  )}
                </div>
                {isAdmin && <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setEditingId(isEditing ? null : build.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ color: isEditing ? "#5FB88A" : "#8FA39A", border: "1px solid #2A3A33" }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => disassembleBuild(build.id)} className="px-2.5 py-1 text-[11px] rounded" style={{ border: "1px solid #2A3A33", color: "#E0664C" }}>Disassemble</button>
                </div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ---- ADMIN PANEL ----
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [invitePassword, setInvitePassword] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*");
    setUsers(data || []);
    setLoading(false);
  };

  const createUser = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim()) return;
    setMessage(null);
    const { data, error } = await supabase.auth.admin?.createUser
      ? await supabase.auth.admin.createUser({ email: inviteEmail, password: invitePassword, email_confirm: true })
      : { error: { message: "Use Supabase dashboard to create users, then set role below." } };
    if (error) { setMessage({ type: "error", text: error.message }); return; }
    if (data?.user) {
      await supabase.from("profiles").insert({ id: data.user.id, email: inviteEmail, role: inviteRole });
      setMessage({ type: "success", text: `User ${inviteEmail} created!` });
      setInviteEmail(""); setInvitePassword("");
      loadUsers();
    }
  };

  const updateRole = async (userId, role) => {
    await supabase.from("profiles").update({ role }).eq("id", userId);
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, role } : x));
  };

  return (
    <div>
      <h2 className="text-sm mb-4" style={{ color: "#8FA39A" }}>Admin Panel</h2>

      {/* Create user */}
      <div className="bench-card rounded p-4 mb-4">
        <div className="text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "#8FA39A" }}>
          <UserPlus size={11} /> Add user
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className={`${inputCls} bench-input`} placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ background: "#131D19", borderColor: "#2A3A33", color: "#EAF0EC" }} />
          <input type="password" className={`${inputCls} bench-input`} placeholder="Password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} style={{ background: "#131D19", borderColor: "#2A3A33", color: "#EAF0EC" }} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={`${inputCls} bench-input text-xs`} style={{ background: "#131D19", borderColor: "#2A3A33", color: "#EAF0EC" }}>
            <option value="viewer">Viewer (read only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
        <p className="text-[10px] mb-3" style={{ color: "#6B8077" }}>
          Note: If user creation fails here, create the user in the Supabase dashboard → Authentication → Users, then their profile will appear below and you can set their role.
        </p>
        {message && <p className="text-xs mb-2" style={{ color: message.type === "error" ? "#E0664C" : "#5FB88A" }}>{message.text}</p>}
        <button onClick={createUser} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded" style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}>
          <UserPlus size={12} /> Create user
        </button>
      </div>

      {/* User list */}
      <div className="bench-card rounded p-4">
        <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: "#8FA39A" }}>Users</div>
        {loading ? <p className="text-xs" style={{ color: "#8FA39A" }}>Loading…</p> : (
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 text-xs p-2 rounded" style={{ background: "#1B2622" }}>
                <span style={{ color: "#EAF0EC" }}>{u.email}</span>
                <select
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  className="text-xs rounded px-2 py-1 outline-none"
                  style={{ background: "#131D19", border: "1px solid #2A3A33", color: u.role === "admin" ? "#D98A4B" : "#8FA39A" }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
            {users.length === 0 && <p className="text-xs" style={{ color: "#6B8077" }}>No users found.</p>}
          </div>
        )}
        <button onClick={loadUsers} className="flex items-center gap-1 text-[11px] mt-3" style={{ color: "#5FB88A" }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
    </div>
  );
}