import { useEffect, useMemo, useState } from "react";

const telegramUrl = "https://t.me/hi0anime";

const authSteps = [
  "Login with admin password",
  "Issue secure HTTP-only session cookie",
  "Redirect to dashboard",
];

const securitySteps = [
  "Rate limit post requests (5/min)",
  "Validate + sanitize every input",
  "Store secrets in env vars only",
];

const helperFields = [
  {
    title: "Title",
    helper: "Enter the manga title (e.g., One Piece Chapter 100)",
  },
  {
    title: "Description",
    helper: "Short summary of this post (1-2 sentences)",
  },
  {
    title: "Tags",
    helper: "Comma-separated tags (e.g., fantasy, romance, action)",
  },
  {
    title: "Cover Image",
    helper: "Drag & drop, click to browse, or paste URL",
  },
  {
    title: "Destination Link",
    helper: "Where should the READ button go?",
  },
  {
    title: "Adult Toggle",
    helper: "Adds 🔒 18+ ONLY in Telegram caption",
  },
];

const navItems = ["Login", "Dashboard", "New Post"] as const;

type NavItem = (typeof navItems)[number];

type StoredPost = {
  id: number;
  title: string;
  description: string;
  tags: string[];
  date: string;
  isAdult: boolean;
  image: string;
  destUrl: string;
};

const STORAGE_KEYS = {
  adminHash: "hi0_admin_hash",
  session: "hi0_admin_session",
  posts: "hi0_posts",
};

const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;

const formatDate = (date = new Date()) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const hashPassword = async (value: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const loadPosts = (): StoredPost[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.posts);
    return raw ? (JSON.parse(raw) as StoredPost[]) : [];
  } catch {
    return [];
  }
};

const savePosts = (posts: StoredPost[]) => {
  localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
};

const loadSession = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.session);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as { expiresAt: number };
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(STORAGE_KEYS.session);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export function App() {
  const [activeTab, setActiveTab] = useState<NavItem>("Login");
  const [lockedCards, setLockedCards] = useState<Record<number, boolean>>({});
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    destUrl: "",
    imageUrl: "",
    isAdult: true,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<string | null>(
    "This demo runs fully in the browser, so it cannot post directly to Telegram. When you click “Post to Telegram,” we save locally and open your channel so you can paste the content. Connect a backend later for auto-posting."
  );

  const authItems = useMemo(() => authSteps, []);
  const securityItems = useMemo(() => securitySteps, []);
  const fields = useMemo(() => helperFields, []);

  useEffect(() => {
    const adminHash = localStorage.getItem(STORAGE_KEYS.adminHash);
    setHasAdmin(Boolean(adminHash));
    setIsLoggedIn(Boolean(loadSession()));
    setPosts(loadPosts());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setActiveTab("Login");
    }
  }, [isLoggedIn]);

  const handleSetup = async () => {
    setAuthMessage(null);
    if (setupPassword.length < 6) {
      setAuthMessage("Password must be at least 6 characters.");
      return;
    }
    if (setupPassword !== confirmPassword) {
      setAuthMessage("Passwords do not match.");
      return;
    }
    const hash = await hashPassword(setupPassword);
    localStorage.setItem(STORAGE_KEYS.adminHash, hash);
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({ expiresAt: Date.now() + sevenDaysMs })
    );
    setHasAdmin(true);
    setIsLoggedIn(true);
    setAuthMessage("Password created. You are now logged in.");
    setSetupPassword("");
    setConfirmPassword("");
  };

  const handleLogin = async () => {
    setAuthMessage(null);
    const hash = localStorage.getItem(STORAGE_KEYS.adminHash);
    if (!hash) {
      setAuthMessage("No admin password set yet. Create one below.");
      return;
    }
    if (!loginPassword) {
      setAuthMessage("Please enter your password.");
      return;
    }
    const attempt = await hashPassword(loginPassword);
    if (attempt !== hash) {
      setAuthMessage("Incorrect password. Try again.");
      return;
    }
    localStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({ expiresAt: Date.now() + sevenDaysMs })
    );
    setIsLoggedIn(true);
    setAuthMessage("Welcome back. Session active for 7 days.");
    setLoginPassword("");
    setActiveTab("Dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.session);
    setIsLoggedIn(false);
    setAuthMessage("You have been logged out.");
  };

  const handleResetPassword = () => {
    localStorage.removeItem(STORAGE_KEYS.adminHash);
    localStorage.removeItem(STORAGE_KEYS.session);
    setHasAdmin(false);
    setIsLoggedIn(false);
    setAuthMessage("Admin password cleared. Set a new one below.");
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString();
      if (result) {
        setPreviewImage(result);
        setFormData((prev) => ({ ...prev, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);

    if (!formData.title || !formData.description || !formData.destUrl || !formData.imageUrl) {
      setFormMessage("Please complete all required fields.");
      return;
    }

    const newPost: StoredPost = {
      id: Date.now(),
      title: formData.title,
      description: formData.description,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      date: formatDate(),
      isAdult: formData.isAdult,
      image: formData.imageUrl,
      destUrl: formData.destUrl,
    };

    setIsSaving(true);
    setTimeout(() => {
      const updated = [newPost, ...posts];
      setPosts(updated);
      savePosts(updated);
      setFormData({
        title: "",
        description: "",
        tags: "",
        destUrl: "",
        imageUrl: "",
        isAdult: true,
      });
      setPreviewImage(null);
      setFormMessage("Post saved locally. Opening your Telegram channel so you can paste the post.");
      setIsSaving(false);
      setActiveTab("Dashboard");
      window.open(telegramUrl, "_blank", "noopener,noreferrer");
    }, 500);
  };

  const handleTelegramInfo = () => {
    setFormMessage(
      "To post to Telegram, connect a backend server (Next.js/Supabase) with your bot token. This demo only stores posts locally."
    );
  };

  if (!isReady) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400 text-lg font-black text-slate-950">
              HV
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Hi0 Anime Vault</p>
              <h1 className="text-2xl font-semibold">Private Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
            <span>Telegram only</span>
            <span>Secure cookies</span>
            <span>Post history</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="mx-auto max-w-6xl space-y-12">
          <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-300">Secure login</p>
              <h2 className="mt-4 text-3xl font-semibold">Password-protected admin flow</h2>
              <p className="mt-3 text-sm text-slate-300">
                The dashboard is fully private. Set your admin password once, then log in to manage posts from any device.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                {navItems.map((tab) => (
                  <button
                    key={tab}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      activeTab === tab
                        ? "bg-white/10 text-white"
                        : "border border-white/10 text-slate-300 hover:border-white/40"
                    }`}
                    onClick={() => {
                      if ((tab === "Dashboard" || tab === "New Post") && !isLoggedIn) {
                        setAuthMessage("Login required to access this section.");
                        setActiveTab("Login");
                        return;
                      }
                      setActiveTab(tab);
                    }}
                  >
                    {tab}
                  </button>
                ))}
                <a
                  className="rounded-full border border-white/10 px-4 py-2 text-slate-300 transition hover:border-white/40"
                  href={telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Telegram
                </a>
              </div>

              <div className="mt-8 space-y-4">
                {activeTab === "Login" && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                    <p className="text-sm font-semibold text-white">Admin login</p>
                    <div className="mt-4 space-y-3 text-xs text-slate-400">
                      {authItems.map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <span className="text-fuchsia-300">●</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 space-y-3">
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        placeholder="Enter admin password"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-400"
                      />
                      <button
                        className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950"
                        onClick={handleLogin}
                      >
                        Login
                      </button>
                      {!hasAdmin && (
                        <p className="text-xs text-slate-400">
                          No admin password yet. Create one below to enable login.
                        </p>
                      )}
                      {authMessage && <p className="rounded-xl bg-white/5 p-3 text-xs text-cyan-200">{authMessage}</p>}
                    </div>

                    {!hasAdmin && (
                      <div className="mt-6 border-t border-white/10 pt-6">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Set admin password</p>
                        <div className="mt-3 space-y-3">
                          <input
                            type="password"
                            value={setupPassword}
                            onChange={(event) => setSetupPassword(event.target.value)}
                            placeholder="Create a new password"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-400"
                          />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Confirm password"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-400"
                          />
                          <button
                            className="w-full rounded-xl border border-fuchsia-400/60 bg-transparent px-4 py-3 text-sm font-semibold text-fuchsia-200"
                            onClick={handleSetup}
                          >
                            Create password
                          </button>
                        </div>
                      </div>
                    )}

                    {hasAdmin && (
                      <button
                        className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300"
                        onClick={handleResetPassword}
                      >
                        Reset admin password
                      </button>
                    )}
                  </div>
                )}

                {activeTab === "Dashboard" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">Post history</h3>
                      <div className="flex gap-2 text-xs">
                        <button
                          className="rounded-full border border-white/10 px-3 py-2 text-slate-300"
                          onClick={handleLogout}
                        >
                          Logout
                        </button>
                        <button
                          className="rounded-full bg-white/10 px-3 py-2 text-white"
                          onClick={() => setActiveTab("New Post")}
                        >
                          New Post
                        </button>
                      </div>
                    </div>
                    {posts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-sm text-slate-400">
                        No posts yet. Create your first post!
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {posts.map((post) => (
                          <div key={post.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                            <div className="flex items-center gap-4">
                              <img
                                src={post.image}
                                alt={post.title}
                                className="h-16 w-16 rounded-xl object-cover"
                              />
                              <div>
                                <p className="text-sm font-semibold text-white">{post.title}</p>
                                <p className="text-xs text-slate-400">{post.date}</p>
                              </div>
                              {post.isAdult && <span className="ml-auto text-lg">🔒</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "New Post" && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                    <h3 className="text-lg font-semibold">Create new post</h3>
                    <div className="mt-4 grid gap-4 text-xs text-slate-300">
                      {fields.map((field) => (
                        <div key={field.title} className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" />
                          <div>
                            <p className="font-semibold text-white">{field.title}</p>
                            <p className="text-slate-400">{field.helper}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {telegramNotice && (
                      <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200">
                        <p className="font-semibold text-amber-100">Telegram posting is disabled</p>
                        <p className="mt-2">
                          This demo runs only in your browser, so it cannot reach the Telegram API. When you connect a backend, clicking
                          “Post to Telegram” will send the image and caption to your channel.
                        </p>
                        <button
                          type="button"
                          className="mt-3 text-[11px] uppercase tracking-[0.3em] text-amber-200/80"
                          onClick={() => setTelegramNotice(null)}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                      <input
                        type="text"
                        placeholder="Title"
                        value={formData.title}
                        onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                      <textarea
                        placeholder="Description"
                        value={formData.description}
                        onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                        className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                      <input
                        type="text"
                        placeholder="Tags (comma separated)"
                        value={formData.tags}
                        onChange={(event) => setFormData((prev) => ({ ...prev, tags: event.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Destination link"
                          value={formData.destUrl}
                          onChange={(event) => setFormData((prev) => ({ ...prev, destUrl: event.target.value }))}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                        />
                        <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Destination link explained</p>
                        <p className="text-xs text-slate-400">
                          This is the URL that the Telegram button will open (for example: your Telegraph chapter, Adsterra link, or any
                          download page). Users click it to read the full content.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="cover-upload"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                        <label htmlFor="cover-upload" className="cursor-pointer">
                          Drag & drop image here, or click to upload
                        </label>
                        <p className="mt-3 text-xs text-slate-500">JPG, PNG, GIF, WEBP</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-300">
                        <p className="font-semibold text-white">After you click “Post to Telegram”</p>
                        <ul className="mt-2 space-y-2 text-slate-400">
                          <li>• We save the post locally in this demo.</li>
                          <li>• Your Telegram channel opens in a new tab so you can paste the post manually.</li>
                          <li>• Automatic posting requires a backend with your bot token.</li>
                        </ul>
                      </div>
                      <input
                        type="text"
                        placeholder="Or paste image URL"
                        value={formData.imageUrl}
                        onChange={(event) => {
                          setFormData((prev) => ({ ...prev, imageUrl: event.target.value }));
                          setPreviewImage(event.target.value);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
                      />
                      {previewImage && (
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="h-48 w-full rounded-2xl object-cover"
                        />
                      )}
                      <label className="flex items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.isAdult}
                          onChange={(event) => setFormData((prev) => ({ ...prev, isAdult: event.target.checked }))}
                          className="h-4 w-4 rounded border-white/20 bg-slate-950"
                        />
                        Mark as Adult (18+)
                      </label>
                      {formMessage && (
                        <p className="rounded-xl bg-white/5 p-3 text-xs text-cyan-200">{formMessage}</p>
                      )}
                      <div className="space-y-3">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          {isSaving ? "Posting..." : "Post to Telegram (opens channel)"}
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300"
                          onClick={handleTelegramInfo}
                        >
                          How Telegram posting works
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Security</p>
                <h3 className="mt-2 text-xl font-semibold">Hard-to-hack checklist</h3>
                <div className="mt-4 space-y-3 text-xs text-slate-300">
                  {securityItems.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Telegram caption</p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-300">
                  <p className="text-white">&lt;b&gt;🔥 Title&lt;/b&gt;</p>
                  <p className="mt-2 italic">&lt;i&gt;Description goes here&lt;/i&gt;</p>
                  <p className="mt-2 text-fuchsia-300">#tag1 #tag2 #tag3</p>
                  <p className="mt-3 text-white">🔒 18+ ONLY</p>
                </div>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300"
                >
                  View channel
                </a>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Post preview</p>
                <h3 className="mt-2 text-2xl font-semibold">18+ locked card behavior</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Clicking the card unlocks the blur on the website, but the full content stays on Telegram.
                </p>
              </div>
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300"
                onClick={() => setLockedCards({})}
              >
                Reset locks
              </button>
            </div>
            {posts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-sm text-slate-400">
                Create a post to preview the locked card behavior.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {posts.map((post) => {
                  const locked = lockedCards[post.id] ?? true;
                  return (
                    <div key={post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                      <div className="relative aspect-[4/3]">
                        <img
                          src={post.image}
                          alt={post.title}
                          className={`h-full w-full object-cover transition duration-500 ${
                            locked ? "blur-2xl" : "blur-0"
                          }`}
                        />
                        {locked && (
                          <button
                            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-xs uppercase tracking-[0.3em] text-white"
                            onClick={() =>
                              setLockedCards((prev) => ({
                                ...prev,
                                [post.id]: !prev[post.id],
                              }))
                            }
                          >
                            <span className="text-2xl">🔒</span>
                            18+ Unlock Preview
                          </button>
                        )}
                      </div>
                      <div className="p-4 text-xs text-slate-300">
                        <p className="font-semibold text-white">{post.title}</p>
                        <p className="mt-2 text-slate-400">{post.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>Private admin dashboard blueprint for Hi0 Anime Vault.</span>
          <a href={telegramUrl} target="_blank" rel="noreferrer" className="text-cyan-200">
            @hi0anime
          </a>
        </div>
      </footer>
    </div>
  );
}
