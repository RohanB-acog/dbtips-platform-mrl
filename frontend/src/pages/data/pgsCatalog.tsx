import { useState, useMemo, useEffect } from "react";
import { useQuery } from "react-query";
import { AgGridReact } from "ag-grid-react";
import { Empty } from "antd";
import { FileText } from "lucide-react";
import parse from "html-react-parser";

// Utils and components
import { fetchData } from "../../utils/fetchData";
import { convertToArray } from "../../utils/helper";
import { filterByDiseases } from "../../utils/filterDisease";
import LoadingButton from "../../components/loading";
import PieChart from "../../components/pieChart";
import ColumnSelector from "../../components/columnFilter";
import DiseaseFilter from "../../components/diseaseFilter";

// Cell renderers as separate components for clarity
const PieChartRenderer = ({ chartData, symbol, heading }) => (
  <div>
    <PieChart chartData={chartData} symbol={symbol} heading={heading} />
  </div>
);

const GwasRenderer = ({ value }) => (
  <PieChartRenderer
    chartData={value?.gwas}
    symbol="G"
    heading="G- Source of Variant Associations (GWAS)"
  />
);

const DevRenderer = ({ value }) => (
  <PieChartRenderer
    chartData={value?.dev}
    symbol="D"
    heading="D - Score Development/Training"
  />
);

const EvalRenderer = ({ value }) => (
  <PieChartRenderer
    chartData={value?.eval}
    symbol="E"
    heading="E - PGS Evaluation"
  />
);

const PgsCatalog = ({ indications }) => {
  const [selectedDisease, setSelectedDisease] = useState(indications);
  const [selectedColumns, setSelectedColumns] = useState([
    "Disease",
    "PGS ID",
    "PGS Publication ID",
    "PGS Reported Trait",
    "PGS Number of Variants",
    "PGS Ancestry Distribution",
    "PGS Scoring File",
  ]);

  // Update selected disease when indications change
  useEffect(() => {
    setSelectedDisease(indications);
  }, [indications]);

  // API request using react-query
  const {
    data: pgsCatalogData,
    error: pgsCatalogError,
    isLoading,
  } = useQuery(
    ["pgsCatalog", { diseases: indications }],
    () => fetchData({ diseases: indications }, "/genomics/pgscatalog"),
    {
      enabled: !!indications.length,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
    }
  );

  // Process data only when it changes
  const processedData = useMemo(
    () => (pgsCatalogData ? convertToArray(pgsCatalogData) : []),
    [pgsCatalogData]
  );

  // Filter data when processed data or selected diseases change
  const filteredData = useMemo(
    () => filterByDiseases(processedData, selectedDisease, indications),
    [processedData, selectedDisease, indications]
  );

  // Column definitions
  const columnDefs = useMemo(
    () => [
      {
        field: "Disease",
        headerName: "Disease",
      },
      {
        field: "PGS ID",
        headerName: "Polygenic Score ID & Name",
        valueGetter: (params) => `
        <div>
          <span>${params.data["PGS ID"]}</span>
          <p class="text-xs">(${params.data["PGS Name"]})</p>
        </div>
      `,
        cellRenderer: (params) => parse(params.value),
      },
      {
        field: "PGS Publication ID",
        headerName: "PGS Publication ID (PGP)",
        valueGetter: (params) => `
        <div>
          <span>${params.data["PGS Publication ID"]}</span>
          <p class="text-xs">${params.data["PGS Publication First Author"]} et al. ${params.data["PGS Publication Journal"]} (${params.data["PGS Publication Year"]})</p>
        </div>
      `,
        cellRenderer: (params) => parse(params.value),
        minWidth: 300,
      },
      {
        field: "PGS Reported Trait",
        headerName: "Reported trait",
      },
      {
        field: "PGS Number of Variants",
        headerName: "Number of Variants",
      },
      {
        field: "PGS Ancestry Distribution",
        headerName: "Ancestry distribution",
        headerClass: "ag-header-cell-center",
        children: [
          {
            headerName: "GWAS",
            field: "PGS Ancestry Distribution",
            cellRenderer: GwasRenderer,
            floatingFilter: false,
            filter: false,
            maxWidth: 70,
            sortable: false,
            headerClass: "ag-header-cell-center",
          },
          {
            headerName: "Dev",
            field: "PGS Ancestry Distribution",
            cellRenderer: DevRenderer,
            floatingFilter: false,
            filter: false,
            maxWidth: 70,
            sortable: false,
            headerClass: "ag-header-cell-center",
          },
          {
            headerName: "Eval",
            field: "PGS Ancestry Distribution",
            cellRenderer: EvalRenderer,
            floatingFilter: false,
            filter: false,
            maxWidth: 70,
            sortable: false,
            headerClass: "ag-header-cell-center",
          },
        ],
      },
      {
        field: "PGS Scoring File",
        headerName: "Scoring File (FTP Link)",
        maxWidth: 140,
        floatingFilter: false,
        filter: false,
        cellRenderer: (params) => (
          <a href={params.value} target="_blank" rel="noreferrer">
            <FileText size={35} />
          </a>
        ),
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
    ],
    []
  );

  // Filter columns based on user selection
  const visibleColumns = useMemo(
    () => columnDefs.filter((col) => selectedColumns.includes(col.field)),
    [columnDefs, selectedColumns]
  );

  // Event handlers
  const handleColumnChange = (columns) => {
    setSelectedColumns(columns);
  };

  // Default AgGrid props for reuse
  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    floatingFilter: true,
    cellStyle: {
      whiteSpace: "normal",
      lineHeight: "20px",
    },
    wrapHeaderText: true,
    autoHeight: true,
    wrapText: true,
  };

  return (
    <div id="pgsCatalog" className="mt-7">
      <h2 className="text-xl subHeading font-semibold mb-3">
        Polygenic risk scores
      </h2>

      <p className="my-1">
        Quantifies an individual's genetic susceptibility to{" "}
        {indications.join(", ")} based on multiple risk variants.
      </p>

      {isLoading && <LoadingButton />}

      {pgsCatalogError && (
        <div>
          <Empty description={`${pgsCatalogError}`} />
        </div>
      )}

      {pgsCatalogData && (
        <div>
          <div className="flex justify-between mb-3">
            <DiseaseFilter
              allDiseases={indications}
              selectedDiseases={selectedDisease}
              onChange={setSelectedDisease}
              disabled={isLoading}
            />

            <ColumnSelector
              allColumns={columnDefs}
              defaultSelectedColumns={selectedColumns}
              onChange={handleColumnChange}
            />
          </div>

          <div className="ag-theme-quartz h-[70vh]">
            <AgGridReact
              defaultColDef={defaultColDef}
              columnDefs={visibleColumns}
              rowData={filteredData}
              pagination={true}
              paginationPageSize={10}
              enableCellTextSelection={true}
              enableRangeSelection={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PgsCatalog;
