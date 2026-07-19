import { Button } from "@/components/ui/button";

type Props = {
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
};

export function IPPagination({ currentPage, totalPages, onGoToPage }: Props) {
  if (totalPages <= 1) return null;

  const startPage = Math.max(1, currentPage - 2);
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => startPage + i).filter(
    (n) => n <= totalPages
  );

  return (
    <div className="flex flex-wrap justify-center items-center gap-2 mt-8 mb-4">
      <Button variant="outline" size="sm" onClick={() => onGoToPage(1)} disabled={currentPage === 1} className="hidden sm:inline-flex">
        First
      </Button>
      <Button variant="outline" size="sm" onClick={() => onGoToPage(currentPage - 1)} disabled={currentPage === 1}>
        ‹ Prev
      </Button>

      {pageNumbers.map((pageNum) => (
        <Button
          key={pageNum}
          size="sm"
          variant={pageNum === currentPage ? "default" : "outline"}
          onClick={() => onGoToPage(pageNum)}
        >
          {pageNum}
        </Button>
      ))}

      <Button variant="outline" size="sm" onClick={() => onGoToPage(currentPage + 1)} disabled={currentPage === totalPages}>
        Next ›
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onGoToPage(totalPages)}
        disabled={currentPage === totalPages}
        className="hidden sm:inline-flex"
      >
        Last
      </Button>

      <span className="text-sm text-muted-foreground ml-4 hidden sm:inline-block">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}
