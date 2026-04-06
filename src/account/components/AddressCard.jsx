function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{address.fullName}</p>
          <p className="text-sm text-muted">{address.line1}</p>
          {address.line2 ? <p className="text-sm text-muted">{address.line2}</p> : null}
          <p className="text-sm text-muted">{address.city}, {address.postalCode}</p>
          <p className="text-sm text-muted">{address.country}</p>
          <p className="text-sm text-muted">{address.phone}</p>
        </div>
        {address.isDefault ? (
          <span className="rounded-full bg-brand-light px-2 py-1 text-xs font-semibold text-brand-dark">Default</span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink">Edit</button>
        <button type="button" onClick={onDelete} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Delete</button>
        {!address.isDefault ? (
          <button type="button" onClick={onSetDefault} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink">Set Default</button>
        ) : null}
      </div>
    </article>
  );
}

export default AddressCard;
