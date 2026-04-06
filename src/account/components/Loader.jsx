function Loader({ label = "Loading..." }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted">
      {label}
    </div>
  );
}

export default Loader;
