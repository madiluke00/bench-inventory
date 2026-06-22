import { useState, useEffect } from "react";
import { Plus, Trash2, Wrench, Boxes, MapPin, X, AlertCircle, Hammer, Tag, ChevronDown, ChevronUp } from "lucide-react";

const FONTS_ID = "bench-fonts";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_ID)) return;
    const link = document.createElement("link");
    link.id = FONTS_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const uid = () => Math.random().toString(36).slice(2, 10);

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch {
      return initial;
    }
  });
  const [loaded] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("localStorage set failed", e);
    }
  }, [key, value]);

  return [value, setValue, loaded];
}

// ---- part helpers (handle both bulk parts and serialized parts) ----
function totalQty(part) {
  return part.serialized ? (part.serials || []).length : part.qty;
}
function allocatedQty(part) {
  if (part.serialized) return (part.serials || []).filter((s) => s.allocatedBuildId).length;
  return (part.allocations || []).reduce((s, a) => s + a.qty, 0);
}
function availableQty(part) {
  return totalQty(part) - allocatedQty(part);
}

function StatusDot({ part }) {
  const avail = availableQty(part);
  const total = totalQty(part);
  let color = "#5FB88A";
  if (total === 0 || avail <= 0) color = "#E0664C";
  else if (avail < total) color = "#D98A4B";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}99` }}
      title={avail <= 0 ? "Fully allocated" : avail < total ? "Partially allocated" : "Available"}
    />
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span
        className="uppercase tracking-wider"
        style={{ color: "#8FA39A", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "bg-transparent border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 transition-colors";

export default function LabInventory() {
  useFonts();

  const [parts, setParts, partsLoaded] = usePersistentState("parts", []);
  const [builds, setBuilds, buildsLoaded] = usePersistentState("builds", []);
  const [tab, setTab] = useState("parts");

  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState({
    name: "",
    qty: "1",
    location: "",
    category: "",
    serialized: false,
    serialsText: "",
  });

  const [showAddBuild, setShowAddBuild] = useState(false);
  const [newBuild, setNewBuild] = useState({ name: "", location: "" });
  const [buildLines, setBuildLines] = useState([{ id: uid(), partId: "", qty: "1", serialIds: [] }]);
  const [buildError, setBuildError] = useState("");

  const addPart = () => {
    if (!newPart.name.trim()) return;

    if (newPart.serialized) {
      const serials = newPart.serialsText
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ id: uid(), serial: s, allocatedBuildId: null }));
      setParts((p) => [
        ...p,
        {
          id: uid(),
          name: newPart.name.trim(),
          location: newPart.location.trim() || "Lab",
          category: newPart.category.trim(),
          serialized: true,
          serials,
        },
      ]);
    } else {
      setParts((p) => [
        ...p,
        {
          id: uid(),
          name: newPart.name.trim(),
          qty: Math.max(0, parseInt(newPart.qty, 10) || 0),
          location: newPart.location.trim() || "Lab",
          category: newPart.category.trim(),
          serialized: false,
          allocations: [],
        },
      ]);
    }

    setNewPart({ name: "", qty: "1", location: "", category: "", serialized: false, serialsText: "" });
    setShowAddPart(false);
  };

  const deletePart = (id) => {
    setParts((p) => p.filter((x) => x.id !== id));
    setBuilds((b) =>
      b.map((bd) => ({ ...bd, lines: bd.lines.filter((l) => l.partId !== id) }))
    );
  };

  const adjustQty = (id, delta) => {
    setParts((p) =>
      p.map((x) =>
        !x.serialized && x.id === id
          ? { ...x, qty: Math.max(allocatedQty(x), x.qty + delta) }
          : x
      )
    );
  };

  const updateLocation = (id, location) => {
    setParts((p) => p.map((x) => (x.id === id ? { ...x, location } : x)));
  };

  const addSerial = (partId, serial) => {
    if (!serial.trim()) return;
    setParts((p) =>
      p.map((x) =>
        x.id === partId
          ? { ...x, serials: [...(x.serials || []), { id: uid(), serial: serial.trim(), allocatedBuildId: null }] }
          : x
      )
    );
  };

  const removeSerial = (partId, serialId) => {
    setParts((p) =>
      p.map((x) =>
        x.id === partId ? { ...x, serials: x.serials.filter((s) => s.id !== serialId) } : x
      )
    );
  };

  const addBuildLine = () =>
    setBuildLines((l) => [...l, { id: uid(), partId: "", qty: "1", serialIds: [] }]);
  const removeBuildLine = (id) => setBuildLines((l) => l.filter((x) => x.id !== id));
  const updateBuildLine = (id, field, value) =>
    setBuildLines((l) => l.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const toggleBuildLineSerial = (id, serialId) =>
    setBuildLines((l) =>
      l.map((x) =>
        x.id === id
          ? {
              ...x,
              serialIds: x.serialIds.includes(serialId)
                ? x.serialIds.filter((s) => s !== serialId)
                : [...x.serialIds, serialId],
            }
          : x
      )
    );

  const createBuild = () => {
    setBuildError("");
    if (!newBuild.name.trim()) {
      setBuildError("Give the build a name.");
      return;
    }

    const lines = [];
    for (const l of buildLines) {
      if (!l.partId) continue;
      const part = parts.find((p) => p.id === l.partId);
      if (!part) continue;
      if (part.serialized) {
        if (l.serialIds.length > 0) lines.push({ partId: l.partId, qty: l.serialIds.length, serialIds: l.serialIds });
      } else {
        const qty = parseInt(l.qty, 10) || 0;
        if (qty > 0) lines.push({ partId: l.partId, qty });
      }
    }

    if (lines.length === 0) {
      setBuildError("Add at least one part to the build.");
      return;
    }

    for (const line of lines) {
      const part = parts.find((p) => p.id === line.partId);
      if (!part) continue;
      if (line.qty > availableQty(part)) {
        setBuildError(`Not enough "${part.name}" available (${availableQty(part)} free).`);
        return;
      }
    }

    const buildId = uid();
    setParts((p) =>
      p.map((part) => {
        const line = lines.find((l) => l.partId === part.id);
        if (!line) return part;
        if (part.serialized) {
          return {
            ...part,
            serials: part.serials.map((s) =>
              line.serialIds.includes(s.id) ? { ...s, allocatedBuildId: buildId } : s
            ),
          };
        }
        return {
          ...part,
          allocations: [...(part.allocations || []), { buildId, qty: line.qty }],
        };
      })
    );

    setBuilds((b) => [
      ...b,
      {
        id: buildId,
        name: newBuild.name.trim(),
        location: newBuild.location.trim() || "Lab",
        lines,
        createdAt: new Date().toISOString(),
      },
    ]);

    setNewBuild({ name: "", location: "" });
    setBuildLines([{ id: uid(), partId: "", qty: "1", serialIds: [] }]);
    setShowAddBuild(false);
  };

  const disassembleBuild = (buildId) => {
    setParts((p) =>
      p.map((part) => {
        if (part.serialized) {
          return {
            ...part,
            serials: (part.serials || []).map((s) =>
              s.allocatedBuildId === buildId ? { ...s, allocatedBuildId: null } : s
            ),
          };
        }
        return {
          ...part,
          allocations: (part.allocations || []).filter((a) => a.buildId !== buildId),
        };
      })
    );
    setBuilds((b) => b.filter((x) => x.id !== buildId));
  };

  const updateBuildLocation = (buildId, location) => {
    setBuilds((b) => b.map((x) => (x.id === buildId ? { ...x, location } : x)));
  };

  const partsById = Object.fromEntries(parts.map((p) => [p.id, p]));

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#0F1714",
        color: "#EAF0EC",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <style>{`
        ::selection { background: #D98A4B55; }
        input::placeholder, textarea::placeholder { color: #5C6E66; }
        .bench-input { background: #131D19; border-color: #2A3A33; color: #EAF0EC; }
        .bench-input:focus { border-color: #5FB88A; ring-color: #5FB88A; }
        .bench-card { background: #141F1B; border: 1px solid #233029; }
        .grid-bg {
          background-image: linear-gradient(#1B2622 1px, transparent 1px), linear-gradient(90deg, #1B2622 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>

      <div className="grid-bg border-b" style={{ borderColor: "#233029" }}>
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: "#1B2622", border: "1px solid #2A3A33" }}
            >
              <Boxes size={16} color="#5FB88A" />
            </div>
            <h1
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
              className="text-xl"
            >
              BENCH<span style={{ color: "#D98A4B" }}>.</span>
            </h1>
          </div>
          <p className="mt-1 text-xs" style={{ color: "#8FA39A" }}>
            Parts inventory &amp; build tracking
          </p>

          <div className="flex gap-1 mt-5">
            {[
              { id: "parts", label: "Parts", icon: Boxes },
              { id: "builds", label: "Builds", icon: Hammer },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t transition-colors"
                style={{
                  background: tab === t.id ? "#141F1B" : "transparent",
                  color: tab === t.id ? "#EAF0EC" : "#8FA39A",
                  border: "1px solid",
                  borderColor: tab === t.id ? "#233029" : "transparent",
                  borderBottom: tab === t.id ? "1px solid #141F1B" : "1px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {!partsLoaded || !buildsLoaded ? (
          <p className="text-xs" style={{ color: "#8FA39A" }}>
            Loading…
          </p>
        ) : tab === "parts" ? (
          <PartsTab
            parts={parts}
            showAddPart={showAddPart}
            setShowAddPart={setShowAddPart}
            newPart={newPart}
            setNewPart={setNewPart}
            addPart={addPart}
            deletePart={deletePart}
            adjustQty={adjustQty}
            updateLocation={updateLocation}
            addSerial={addSerial}
            removeSerial={removeSerial}
            builds={builds}
          />
        ) : (
          <BuildsTab
            builds={builds}
            parts={parts}
            partsById={partsById}
            showAddBuild={showAddBuild}
            setShowAddBuild={setShowAddBuild}
            newBuild={newBuild}
            setNewBuild={setNewBuild}
            buildLines={buildLines}
            addBuildLine={addBuildLine}
            removeBuildLine={removeBuildLine}
            updateBuildLine={updateBuildLine}
            toggleBuildLineSerial={toggleBuildLineSerial}
            createBuild={createBuild}
            buildError={buildError}
            disassembleBuild={disassembleBuild}
            updateBuildLocation={updateBuildLocation}
          />
        )}
      </div>
    </div>
  );
}

function PartsTab({
  parts,
  showAddPart,
  setShowAddPart,
  newPart,
  setNewPart,
  addPart,
  deletePart,
  adjustQty,
  updateLocation,
  addSerial,
  removeSerial,
  builds,
}) {
  const [expanded, setExpanded] = useState({});
  const [serialDraft, setSerialDraft] = useState({});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm" style={{ color: "#8FA39A" }}>
          {parts.length} part{parts.length === 1 ? "" : "s"}
        </h2>
        <button
          onClick={() => setShowAddPart((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors"
          style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#5FB88A" }}
        >
          <Plus size={13} /> Add part
        </button>
      </div>

      {showAddPart && (
        <div className="bench-card rounded p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input
                autoFocus
                className={`${inputCls} bench-input`}
                placeholder="e.g. ESP32-WROOM-32"
                value={newPart.name}
                onChange={(e) => setNewPart((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="Location">
              <input
                className={`${inputCls} bench-input`}
                placeholder="e.g. Drawer B3"
                value={newPart.location}
                onChange={(e) => setNewPart((p) => ({ ...p, location: e.target.value }))}
              />
            </Field>
            <Field label="Category (optional)">
              <input
                className={`${inputCls} bench-input`}
                placeholder="e.g. Microcontroller"
                value={newPart.category}
                onChange={(e) => setNewPart((p) => ({ ...p, category: e.target.value }))}
              />
            </Field>
            {!newPart.serialized && (
              <Field label="Quantity">
                <input
                  type="number"
                  min="0"
                  className={`${inputCls} bench-input`}
                  value={newPart.qty}
                  onChange={(e) => setNewPart((p) => ({ ...p, qty: e.target.value }))}
                />
              </Field>
            )}
          </div>

          <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer select-none" style={{ color: "#8FA39A" }}>
            <input
              type="checkbox"
              checked={newPart.serialized}
              onChange={(e) => setNewPart((p) => ({ ...p, serialized: e.target.checked }))}
              style={{ accentColor: "#D98A4B" }}
            />
            This part has individual serial numbers
          </label>

          {newPart.serialized && (
            <div className="mt-2">
              <Field label="Serial numbers (one per line, or comma-separated)">
                <textarea
                  className={`${inputCls} bench-input`}
                  rows={3}
                  placeholder={"e.g.\nSN-001\nSN-002\nSN-003"}
                  value={newPart.serialsText}
                  onChange={(e) => setNewPart((p) => ({ ...p, serialsText: e.target.value }))}
                />
              </Field>
              <p className="text-[10px] mt-1" style={{ color: "#6B8077" }}>
                Quantity is set automatically from how many serials you enter — currently{" "}
                {newPart.serialsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length}.
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={addPart}
              className="px-3 py-1.5 text-xs rounded"
              style={{ background: "#5FB88A", color: "#0F1714", fontWeight: 600 }}
            >
              Save part
            </button>
            <button
              onClick={() => setShowAddPart(false)}
              className="px-3 py-1.5 text-xs rounded"
              style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {parts.length === 0 && !showAddPart && (
        <div className="bench-card rounded p-6 text-center">
          <p className="text-sm" style={{ color: "#8FA39A" }}>
            No parts yet. Add your first one to start tracking the lab.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {parts.map((part) => {
          const avail = availableQty(part);
          const used = allocatedQty(part);
          const total = totalQty(part);
          const isOpen = !!expanded[part.id];
          return (
            <div key={part.id} className="bench-card rounded p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="mt-1.5">
                    <StatusDot part={part} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: "#EAF0EC" }}>
                        {part.name}
                      </span>
                      {part.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1B2622", color: "#8FA39A" }}>
                          {part.category}
                        </span>
                      )}
                      {part.serialized && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "#1B2622", color: "#D98A4B" }}
                        >
                          <Tag size={9} /> serialized
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#8FA39A" }}>
                      {avail} available · {total} total
                      {used > 0 && <span style={{ color: "#D98A4B" }}> · {used} allocated</span>}
                    </div>

                    {!part.serialized && used > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {(part.allocations || []).map((a) => {
                          const b = builds.find((bd) => bd.id === a.buildId);
                          return (
                            <span key={a.buildId} className="text-[11px]" style={{ color: "#6B8077" }}>
                              ↳ {a.qty} used in {b ? b.name : "(deleted build)"}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-2">
                      <MapPin size={11} color="#6B8077" />
                      <input
                        value={part.location}
                        onChange={(e) => updateLocation(part.id, e.target.value)}
                        className="text-xs bg-transparent outline-none border-b"
                        style={{ color: "#8FA39A", borderColor: "transparent", width: "140px" }}
                        onFocus={(e) => (e.target.style.borderColor = "#2A3A33")}
                        onBlur={(e) => (e.target.style.borderColor = "transparent")}
                      />
                    </div>

                    {part.serialized && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [part.id]: !e[part.id] }))}
                          className="flex items-center gap-1 text-[11px]"
                          style={{ color: "#5FB88A" }}
                        >
                          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isOpen ? "Hide serials" : `View ${total} serial${total === 1 ? "" : "s"}`}
                        </button>

                        {isOpen && (
                          <div className="mt-2 flex flex-col gap-1 pl-1 border-l" style={{ borderColor: "#233029" }}>
                            {(part.serials || []).map((s) => {
                              const b = s.allocatedBuildId ? builds.find((bd) => bd.id === s.allocatedBuildId) : null;
                              return (
                                <div key={s.id} className="flex items-center justify-between gap-2 pl-2 text-[11px]">
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: s.allocatedBuildId ? "#D98A4B" : "#5FB88A" }}
                                    />
                                    <span style={{ color: "#EAF0EC" }}>{s.serial}</span>
                                    {b && <span style={{ color: "#6B8077" }}>— used in {b.name}</span>}
                                  </span>
                                  {!s.allocatedBuildId && (
                                    <button onClick={() => removeSerial(part.id, s.id)} style={{ color: "#E0664C" }}>
                                      <X size={11} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex items-center gap-1.5 pl-2 mt-1">
                              <input
                                value={serialDraft[part.id] || ""}
                                onChange={(e) => setSerialDraft((d) => ({ ...d, [part.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    addSerial(part.id, serialDraft[part.id] || "");
                                    setSerialDraft((d) => ({ ...d, [part.id]: "" }));
                                  }
                                }}
                                placeholder="New serial number…"
                                className="text-[11px] bg-transparent outline-none border-b py-0.5"
                                style={{ color: "#EAF0EC", borderColor: "#2A3A33", width: "140px" }}
                              />
                              <button
                                onClick={() => {
                                  addSerial(part.id, serialDraft[part.id] || "");
                                  setSerialDraft((d) => ({ ...d, [part.id]: "" }));
                                }}
                                style={{ color: "#5FB88A" }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!part.serialized && (
                    <>
                      <button
                        onClick={() => adjustQty(part.id, -1)}
                        className="w-6 h-6 rounded text-xs flex items-center justify-center"
                        style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}
                      >
                        −
                      </button>
                      <span className="text-xs w-5 text-center">{part.qty}</span>
                      <button
                        onClick={() => adjustQty(part.id, 1)}
                        className="w-6 h-6 rounded text-xs flex items-center justify-center"
                        style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}
                      >
                        +
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deletePart(part.id)}
                    className="w-6 h-6 rounded text-xs flex items-center justify-center ml-1"
                    style={{ color: "#E0664C" }}
                    title="Delete part"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuildsTab({
  builds,
  parts,
  partsById,
  showAddBuild,
  setShowAddBuild,
  newBuild,
  setNewBuild,
  buildLines,
  addBuildLine,
  removeBuildLine,
  updateBuildLine,
  toggleBuildLineSerial,
  createBuild,
  buildError,
  disassembleBuild,
  updateBuildLocation,
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm" style={{ color: "#8FA39A" }}>
          {builds.length} build{builds.length === 1 ? "" : "s"}
        </h2>
        <button
          onClick={() => setShowAddBuild((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors"
          style={{ background: "#1B2622", border: "1px solid #2A3A33", color: "#D98A4B" }}
        >
          <Plus size={13} /> New build
        </button>
      </div>

      {showAddBuild && (
        <div className="bench-card rounded p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="Build name">
              <input
                autoFocus
                className={`${inputCls} bench-input`}
                placeholder="e.g. WoW01 weigh unit"
                value={newBuild.name}
                onChange={(e) => setNewBuild((b) => ({ ...b, name: e.target.value }))}
              />
            </Field>
            <Field label="Location">
              <input
                className={`${inputCls} bench-input`}
                placeholder="e.g. Darling Downs site"
                value={newBuild.location}
                onChange={(e) => setNewBuild((b) => ({ ...b, location: e.target.value }))}
              />
            </Field>
          </div>

          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#8FA39A" }}>
            Parts used
          </div>
          <div className="flex flex-col gap-2">
            {buildLines.map((line) => {
              const selected = partsById[line.partId];
              const avail = selected ? availableQty(selected) : null;
              return (
                <div key={line.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <select
                      value={line.partId}
                      onChange={(e) => updateBuildLine(line.id, "partId", e.target.value)}
                      className={`${inputCls} bench-input flex-1`}
                    >
                      <option value="">Select part…</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id} disabled={availableQty(p) <= 0}>
                          {p.name} ({availableQty(p)} free){p.serialized ? " — serialized" : ""}
                        </option>
                      ))}
                    </select>
                    {selected && !selected.serialized && (
                      <input
                        type="number"
                        min="1"
                        max={avail ?? undefined}
                        value={line.qty}
                        onChange={(e) => updateBuildLine(line.id, "qty", e.target.value)}
                        className={`${inputCls} bench-input w-16`}
                      />
                    )}
                    <button
                      onClick={() => removeBuildLine(line.id)}
                      style={{ color: "#6B8077" }}
                      className="shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {selected && selected.serialized && (
                    <div
                      className="ml-1 pl-2 flex flex-col gap-1 border-l"
                      style={{ borderColor: "#233029" }}
                    >
                      <span className="text-[10px]" style={{ color: "#6B8077" }}>
                        Pick specific units ({line.serialIds.length} selected)
                      </span>
                      {(selected.serials || [])
                        .filter((s) => !s.allocatedBuildId)
                        .map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 text-[11px] cursor-pointer"
                            style={{ color: "#EAF0EC" }}
                          >
                            <input
                              type="checkbox"
                              checked={line.serialIds.includes(s.id)}
                              onChange={() => toggleBuildLineSerial(line.id, s.id)}
                              style={{ accentColor: "#D98A4B" }}
                            />
                            {s.serial}
                          </label>
                        ))}
                      {(selected.serials || []).filter((s) => !s.allocatedBuildId).length === 0 && (
                        <span className="text-[11px]" style={{ color: "#E0664C" }}>
                          No free units left.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={addBuildLine}
            className="text-xs mt-2 flex items-center gap-1"
            style={{ color: "#5FB88A" }}
          >
            <Plus size={12} /> Add another part
          </button>

          {buildError && (
            <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "#E0664C" }}>
              <AlertCircle size={13} /> {buildError}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={createBuild}
              className="px-3 py-1.5 text-xs rounded"
              style={{ background: "#D98A4B", color: "#0F1714", fontWeight: 600 }}
            >
              Create build
            </button>
            <button
              onClick={() => setShowAddBuild(false)}
              className="px-3 py-1.5 text-xs rounded"
              style={{ border: "1px solid #2A3A33", color: "#8FA39A" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {builds.length === 0 && !showAddBuild && (
        <div className="bench-card rounded p-6 text-center">
          <p className="text-sm" style={{ color: "#8FA39A" }}>
            No builds yet. Group parts into a build once you've assembled something.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {builds.map((build) => (
          <div key={build.id} className="bench-card rounded p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Wrench size={13} color="#D98A4B" />
                  <span className="text-sm font-semibold">{build.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <MapPin size={11} color="#6B8077" />
                  <input
                    value={build.location}
                    onChange={(e) => updateBuildLocation(build.id, e.target.value)}
                    className="text-xs bg-transparent outline-none border-b"
                    style={{ color: "#8FA39A", borderColor: "transparent", width: "160px" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2A3A33")}
                    onBlur={(e) => (e.target.style.borderColor = "transparent")}
                  />
                </div>
                <div className="mt-2 flex flex-col gap-0.5">
                  {build.lines.map((line) => {
                    const part = partsById[line.partId];
                    const serialNames =
                      line.serialIds && part
                        ? line.serialIds
                            .map((sid) => part.serials?.find((s) => s.id === sid)?.serial)
                            .filter(Boolean)
                        : null;
                    return (
                      <span key={line.partId} className="text-[11px]" style={{ color: "#6B8077" }}>
                        ↳ {line.qty}× {part ? part.name : "(deleted part)"}
                        {serialNames && serialNames.length > 0 && (
                          <span style={{ color: "#8FA39A" }}> (SN: {serialNames.join(", ")})</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => disassembleBuild(build.id)}
                className="px-2.5 py-1 text-[11px] rounded shrink-0"
                style={{ border: "1px solid #2A3A33", color: "#E0664C" }}
                title="Break this build back into its parts"
              >
                Disassemble
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
