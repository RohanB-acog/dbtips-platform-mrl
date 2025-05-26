import { useQuery } from "react-query";
import { useState, useEffect, useMemo } from "react";
import { fetchData } from "../../utils/fetchData";
import Table from "../../components/testTable";
import { Modal, Empty, Select } from "antd";
// import * as XLSX from "xlsx";
import LoadingButton from "../../components/loading";
import { capitalizeFirstLetter } from "../../utils/helper";
// import { FileExcelOutlined } from "@ant-design/icons";
import ExportButton from "../../components/testExportButton"
import ColumnSelector from "../../components/columnFilter";
const { Option } = Select;
export function convertToArray(data) {
  const result = [];
  Object.keys(data).forEach((disease) => {
    data[disease]["data"]?.forEach((record) => {
      result.push({
        ...record,
        Disease: capitalizeFirstLetter(disease), // Add the disease key
      });
    });
  });
  return result;
}
// const processDataForExport = (data) => {
//   return data.map((row) => ({
//     Disease: row.Disease,
//     "Test Name": row.testname,
//     Location: row.location,
//     "Genes, analytes, and microbes": row.analytes.Gene.length,
//     Methods: row.methods.join(", "),
//     "Target Population": row.targetpopulation,
//   }));
// };
const GeneticTestingRegistery = ({ indications }) => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(indications);
  const [geneData, setGeneData] = useState([]);
  useEffect(() => {
    setSelectedDisease(indications);
  }, [indications]);
  const handleDiseaseChange = (value: string[]) => {
    if (value.includes("All")) {
      // If "All" is selected, select all diseases but don't include "All" in display
      setSelectedDisease(indications);
    } else if (
      selectedDisease.length === indications.length &&
      value.length < indications.length
    ) {
      // If coming from "all selected" state and deselecting, just use the new selection
      setSelectedDisease(value);
    } else {
      // Normal selection behavior
      setSelectedDisease(value);
    }
  };
  const payload = {
    diseases: indications,
  };
  const [selectedColumns, setSelectedColumns] = useState([
    "Disease",
    "testname",
    "location",
    "offerer",
    "analytes.Gene",
    "methods",
    "targetpopulation",
  ]);
  const columnDefs = [
    { field: "Disease", headerName: "Disease" },
    { headerName: "Test Name", field: "testname" },
    { headerName: "Location", field: "location" },
    {
      field:"offerer",
    },
    {
      headerName: "Genes, analytes, and microbes",
      field: "analytes.Gene",

      valueFormatter: (params) => (params.value ? params.value.length : ""),
      cellRenderer: (params) => {
        return (
          <div>
            <div
              onClick={() => {
                setOpenModal(true);
                setGeneData(params.value);
              }}
              className="underline cursor-pointer"
            >
              {params?.value?.length}
            </div>
          </div>
        );
      },
    },
    {
      headerName: "Methods",
      field: "methods",
      valueFormatter: (params) => (params.value ? params.value.join(", ") : ""),
    },
    { headerName: "Target Population", field: "targetpopulation" },
  ];
  const visibleColumns = useMemo(() => {
		return columnDefs.filter((col) => selectedColumns.includes(col.field));
	}, [columnDefs, selectedColumns]);
  const handleColumnChange = (columns: string[]) => {
		setSelectedColumns(columns);
	};
  const {
    data: geneticTestingData,
    error: geneticTestingError,
    isLoading: geneticTestingIsLoading,
  } = useQuery(
    ["genticTesting", payload],
    () => fetchData(payload, "/disease-profile/genetic_testing_registery/"),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
    }
  );
  const processedData = useMemo(() => {
    if (geneticTestingData) {
      return convertToArray(geneticTestingData);
    }
    return [];
  }, [geneticTestingData]);

  // Filter data when processed data or selected indication changes
  const filteredData = useMemo(() => {
    if (processedData.length > 0) {
      // If all diseases are selected (length matches total indications)
      return selectedDisease.length === indications.length
        ? processedData
        : processedData.filter((row) =>
            selectedDisease.some(
              (indication) =>
                indication.toLowerCase() === row.Disease.toLowerCase()
            )
          );
    }

    return [];
  }, [processedData, selectedDisease]);

  
  
  
  return (
    <div className=" " id="GTR">
      <div>
        <h2 className="text-xl subHeading font-semibold mb-3">
          Genetic Testing Registry
        </h2>
        <p className="my-1 font-medium">
        List of commercially available genetic testing panels used for clinical purposes (diagnosis, predictive, prognosis, risk assessment, screening, drug response, etc.) as submitted by the provider.
        </p>
      </div>
      {geneticTestingIsLoading && <LoadingButton />}
      {geneticTestingError && (
        <div className=" h-[50vh] max-h-[280px] flex items-center justify-center">
          <Empty description={` ${geneticTestingError}`} />
        </div>
      )}

      {geneticTestingData && (
        <div>
          
          <div className="my-4 flex justify-between">
            <div>
            <span className="mt-4 mr-1">Disease: </span>
            <Select
              style={{ width: 500 }}
              onChange={handleDiseaseChange}
              mode="multiple"
              value={selectedDisease}
              disabled={geneticTestingIsLoading}
              showSearch={false}
              placeholder="Select indications"
              maxTagCount="responsive"
              defaultActiveFirstOption={true}
            >
              <Option value="All">All</Option>
              {indications.map((indication) => (
                <Option key={indication} value={indication}>
                  {indication}
                </Option>
              ))}
            </Select>
            </div>
            <div className="flex gap-2">

            <ColumnSelector
									allColumns={columnDefs}
									defaultSelectedColumns={selectedColumns}
									onChange={handleColumnChange}
								/>
            <ExportButton indications={indications} endpoint="/disease-profile/genetic_testing_registery/" fileName="GeneticTestingRegistry" />
            </div>
          </div>
          <Table columnDefs={visibleColumns} rowData={filteredData} />
        </div>
      )}
      <Modal
        title="Gene"
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        width={1000} // Adjust as needed
      >
        <div className="grid grid-cols-4 gap-4 overflow-auto max-h-[400px] p-2">
          {geneData
            .slice() // Create a copy to avoid mutating the original array
            .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
            .map((gene, index) => (
              <div key={index} className="border-b border-gray-300 pb-1">
                {gene}
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
};

export default GeneticTestingRegistery;