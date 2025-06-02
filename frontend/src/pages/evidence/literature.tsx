import { useEffect, useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { Empty, message, Tooltip, Button } from "antd";
import LoadingButton from "../../components/loading";
import parse from "html-react-parser";
import { fetchData } from "../../utils/fetchData";
import { useQuery } from "react-query";
import SelectedLiterature from "./selectedLiterature";
import { useChatStore } from "chatbot-component";
import BotIcon from "../../assets/bot.svg?react";
import { preprocessLiteratureData } from "../../utils/llmUtils";
import { convertDiseaseObjectToArray } from "../../utils/helper";
import ColumnSelector from "../../components/columnFilter";
import { filterByDiseases } from "../../utils/filterDisease";
import Exportbutton from "../../components/exportButton";
import DiseaseFilter from "../../components/diseaseFilter";

const Literature = ({ indications }) => {
  const [selectedIndication, setSelectedIndication] = useState(indications);
  const [selectedLiterature, setSelectedLiterature] = useState([]);
  const { register, invoke } = useChatStore();
  const [selectedColumns, setSelectedColumns] = useState([
    "checkbox",
    "Disease",
    "Year",
    "Qualifers",
    "Title",
    "authors",
    "citedby",
  ]);
  const columnDefs = useMemo(
    () => [
      {
        headerName: "",
        field: "checkbox",
        checkboxSelection: true,
        filter: false,
        flex: 0.5,
      },
      {
        field: "Disease",
        headerName: "Disease",
        flex: 3,
      },
      { field: "Year" },
      {
        field: "Qualifers",
        headerName: "Category",
        flex: 3,
        valueFormatter: (params) => {
          if (params.value) {
            return params.value.join(", ");
          }
          return "";
        },
      },
      {
        field: "Title",
        headerName: "Title",
        flex: 8,
        cellRenderer: (params) => {
          return (
            <a href={params.data.PubMedLink} target="_blank">
              {parse(params.value)}
            </a>
          );
        },
      },
      {
        headerName: "Authors",
        field: "authors",
        cellRenderer: (params) => {
          const authors = params.value;

          if (!authors || authors.length === 0) {
            return "";
          }

          // Show all authors if there are 4 or fewer
          if (authors.length <= 4) {
            return <div>{authors.join(", ")}</div>;
          }

          // For more than 4 authors, show first 3 and last one with tooltip
          const displayText = ` ${authors.slice(0, 3).join(", ")}, .... , ${
            authors[authors.length - 1]
          }`;
          const allAuthors = ` ${authors.join(", ")}`;

          return (
            <Tooltip title={allAuthors} placement="topLeft">
              <div className="truncated-authors">{displayText}</div>
            </Tooltip>
          );
        },
        flex: 3,
      },
      {
        field: "citedby",
        headerName: "Cited by",
        flex: 2,
      },
    ],
    []
  );
  const visibleColumns = useMemo(() => {
    return columnDefs.filter((col) => selectedColumns.includes(col.field));
  }, [columnDefs, selectedColumns]);
  const handleColumnChange = (columns: string[]) => {
    setSelectedColumns(columns);
  };
  const payload = {
    diseases: indications,
  };

  const {
    data: evidenceLiteratureData,
    error: evidenceLiteratureError,
    isLoading: evidenceLiteratureLoading,
    isFetching: evidenceLiteratureFetching,
  } = useQuery(
    ["evidenceLiterature", payload],
    () => fetchData(payload, "/evidence/literature/"),
    {
      enabled: !!indications.length,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
    }
  );
  useEffect(() => {
    if (indications.length > 0) {
      setSelectedIndication(indications);
    }
  }, [indications]);
  const processedData = useMemo(() => {
    if (evidenceLiteratureData) {
      return convertDiseaseObjectToArray(evidenceLiteratureData, "literature");
    }
    return [];
  }, [evidenceLiteratureData]);

  const rowData = useMemo(() => {
    return filterByDiseases(processedData, selectedIndication, indications);
  }, [processedData, selectedIndication, indications]);

  const onSelectionChanged = (event: any) => {
    const selectedNodes = event.api.getSelectedNodes();
    const selectedCount = selectedNodes.length;

    if (selectedCount > 10) {
      // Deselect the latest selection
      const lastSelectedNode = selectedNodes[selectedNodes.length - 1];
      lastSelectedNode.setSelected(false);
      message.warning("You can select a maximum of 10 rows.");
    } else {
      const selectedData = selectedNodes.map((node: any) => node.data);
      setSelectedLiterature(selectedData);
    }
  };
  const showLoading = evidenceLiteratureLoading || evidenceLiteratureFetching;

  useEffect(() => {
    if (selectedLiterature?.length > 0) {
      const llmData = preprocessLiteratureData(selectedLiterature);
      const urls = selectedLiterature.map((data: any) => data.PubMedLink);
      const diseases = [
        ...new Set(selectedLiterature.map((data: any) => data.Disease)),
      ];
      register("literature", {
        urls: urls,
        diseases: diseases,
        data: llmData,
      });
    }

    // return () => {
    // 	unregister('pipeline_indications');
    // };
  }, [selectedLiterature]);

  const handleLLMCall = () => {
    if(processedData.length===0){
      message.warning("This feature requires context to be passed to LLM. As there is no data available, this feature cannot be used");
      return;
    }
    invoke("literature", { send: false });
  };
  return (
    <section id="literature-evidence" className="px-[5vw]">
      <h1 className="text-3xl font-semibold">Literature reviews</h1>
      <p className="my-2  font-medium ">
        This section provides a recent collection of disease research reviews
        for understanding the pathophysiology and therapeutic landscape of the
        disease.
      </p>
      <DiseaseFilter
        allDiseases={indications}
        selectedDiseases={selectedIndication}
        onChange={setSelectedIndication}
        disabled={showLoading}
        width={500}
      />

      <SelectedLiterature
        selectedIndication={selectedIndication}
        indications={indications}
      />
      <div className="flex justify-between  mt-10 mb-3">
        <div className="flex items-center space-x-5  ">
          <h2 className="subHeading text-xl font-semibold">
            Review repository
          </h2>
          <Tooltip title="Please select articles to ask LLM">
            <Button
              type="default" // This will give it a simple outline
              onClick={handleLLMCall}
              className="w-18 h-8 text-blue-800 text-sm flex items-center"
            >
              <BotIcon width={16} height={16} fill="#d50f67" />
              <span>Ask LLM</span>
            </Button>
          </Tooltip>
        </div>
        <div className="flex gap-2">
          <ColumnSelector
            allColumns={columnDefs}
            defaultSelectedColumns={selectedColumns}
            onChange={handleColumnChange}
          />
          <Exportbutton
            endpoint="/evidence/literature/"
            fileName="literature_reviews"
            indications={indications}
          />
        </div>
      </div>

      {showLoading && <LoadingButton />}

      {evidenceLiteratureError &&
        !evidenceLiteratureLoading &&
        !evidenceLiteratureData && (
          <div className="ag-theme-quartz mt-4 h-[80vh] max-h-[280px] flex items-center justify-center">
            <Empty description={`${evidenceLiteratureError}`} />
          </div>
        )}

      {!showLoading && !evidenceLiteratureError && (
        <>
          <div className="ag-theme-quartz h-[80vh] max-h-[540px]">
            <AgGridReact
              defaultColDef={{
                flex: 1,
                filter: true,
                sortable: true,
                floatingFilter: true,
                headerClass: "font-semibold",
                autoHeight: true,
                wrapText: true,
                cellStyle: { whiteSpace: "normal", lineHeight: "20px" },
              }}
              columnDefs={visibleColumns}
              rowData={rowData}
              rowSelection="multiple"
              onSelectionChanged={onSelectionChanged}
              rowMultiSelectWithClick={true}
              pagination={true}
              enableRangeSelection={true}
              enableCellTextSelection={true}
            />
          </div>
        </>
      )}
    </section>
  );
};

export default Literature;
