import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stores in Qatar — FirstStop",
  description: "Visit a FirstStop store across Qatar.",
};

const STORES = [
  {
    name: "FirstStop Al Sadd (Flagship)",
    address: "Building 24, Salwa Road, Al Sadd, Doha",
    hours: "Sat–Thu 10:00–22:00 · Fri 14:00–22:00",
    phone: "+974 4400 0000",
  },
  {
    name: "FirstStop Lusail",
    address: "Place Vendôme Mall, Lusail",
    hours: "Daily 10:00–23:00",
    phone: "+974 4400 0011",
  },
  {
    name: "FirstStop Al Wakrah",
    address: "Al Wakrah Mall, Al Wakrah",
    hours: "Sat–Thu 10:00–22:00 · Fri 14:00–22:00",
    phone: "+974 4400 0022",
  },
  {
    name: "FirstStop Al Khor",
    address: "Al Khor Mall, Al Khor",
    hours: "Daily 10:00–22:00",
    phone: "+974 4400 0033",
  },
];

export default function StoresPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stores in Qatar</h1>
      <p className="mt-2 text-slate-500">
        Come say hello — our team is happy to help you choose, or hand over an online order.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {STORES.map((store) => (
          <div key={store.name} className="rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900">{store.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{store.address}</p>
            <p className="mt-1 text-sm text-slate-500">{store.hours}</p>
            <p className="mt-1 text-sm">
              <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="text-blue-600 hover:underline">
                {store.phone}
              </a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
