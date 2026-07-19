import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IPSearchFacets } from "@/lib/api/types";

type Props = {
  facets: IPSearchFacets;
  yearFrom: string;
  setYearFrom: (v: string) => void;
  yearTo: string;
  setYearTo: (v: string) => void;
  typeOfIp: string;
  setTypeOfIp: (v: string) => void;
  fieldOfInvention: string;
  setFieldOfInvention: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
};

export function IPFilterPanel({
  facets,
  yearFrom,
  setYearFrom,
  yearTo,
  setYearTo,
  typeOfIp,
  setTypeOfIp,
  fieldOfInvention,
  setFieldOfInvention,
  country,
  setCountry,
  onApply,
  onClear,
}: Props) {
  const typeOptions = facets.type_of_ip ?? [];
  const fieldOptions = facets.field_of_invention ?? [];
  const countryOptions = facets.country ?? [];

  return (
    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-[440px] bg-card border border-border rounded-xl shadow-xl p-5 space-y-4 animate-slide-up max-h-[75vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Year From</label>
          <Input
            type="number"
            placeholder="2015"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            min="1900"
            max="2100"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Year To</label>
          <Input
            type="number"
            placeholder="2025"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            min="1900"
            max="2100"
            className="h-9"
          />
        </div>
      </div>

      {typeOptions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Type of IP</label>
          <select
            className="w-full px-3 py-2 h-9 text-sm border border-input rounded-md bg-background capitalize"
            value={typeOfIp}
            onChange={(e) => setTypeOfIp(e.target.value)}
          >
            <option value="">All types</option>
            {typeOptions.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.value} ({opt.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {fieldOptions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Field of Invention</label>
          <select
            className="w-full px-3 py-2 h-9 text-sm border border-input rounded-md bg-background"
            value={fieldOfInvention}
            onChange={(e) => setFieldOfInvention(e.target.value)}
          >
            <option value="">All fields</option>
            {fieldOptions.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.value} ({opt.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {countryOptions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Country</label>
          <select
            className="w-full px-3 py-2 h-9 text-sm border border-input rounded-md bg-background"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">All countries</option>
            {countryOptions.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.value} ({opt.count})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={onApply} size="sm">
          Apply
        </Button>
        <Button variant="outline" onClick={onClear} size="sm">
          Clear
        </Button>
      </div>
    </div>
  );
}
