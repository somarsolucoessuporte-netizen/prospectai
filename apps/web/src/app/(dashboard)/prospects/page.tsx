import { ProspectTable } from "@/components/features/prospects/ProspectTable";
import { SearchForm } from "@/components/features/prospects/SearchForm";

export default function ProspectsPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prospecção</h1>
        <p className="mt-1 text-gray-500">
          Encontre empresas por nicho e região usando dados do OpenStreetMap.
        </p>
      </div>

      <SearchForm />
      <ProspectTable />
    </div>
  );
}
