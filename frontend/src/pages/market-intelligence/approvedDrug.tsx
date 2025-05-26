import { useState, useMemo, useEffect, useCallback } from "react";
import { Empty, Select, Modal } from "antd";
import LoadingButton from "../../components/loading";
import Table from "../../components/testTable";
import { capitalizeFirstLetter } from "../../utils/helper";
import {fetchData} from "../../utils/fetchData";
import ColumnSelector from "../../components/columnFilter";
import { useQuery } from "react-query";
import { ArrowUpRight, AlertTriangle, BookOpen, MapPin } from 'lucide-react';

const { Option } = Select;

function createApprovedDrugsPayload(data) {
  const diseaseMap = {};
  data.forEach(({ Disease, Drug }) => {
    const cleanedDrugName = Drug.split("(")[0].trim();
    if (!diseaseMap[Disease]) {
      diseaseMap[Disease] = new Set();
    }
    diseaseMap[Disease].add(cleanedDrugName);
  });
  return Object.entries(diseaseMap).map(([disease, drugsSet]) => ({
    disease,
    approved_drugs: Array.from(drugsSet as Set<string>),
  }));
}
const ApprovedDrug = ({
  approvedDrugData,
  loading,
  error,
  indications,
  isFetchingData,
}) => {
  const [selectedDisease, setSelectedDisease] = useState(indications || []);
  const [openModal, setOpenModal] = useState(false);
  const [modalData, setModalData] = useState(undefined);
  const [payload, setPayload] = useState({});
  const [selectedColumns, setSelectedColumns] = useState([
    "Disease",
    "Target",
    "Drug",
    "blackbox",
  ]);
  
  const {
    data: geneticTestingData,
    error: geneticTestingError,
    isLoading: geneticTestingIsLoading,
  } = useQuery(
    ["blackboxwarning", payload],
    () => fetchData(payload, "/market-intelligence/blackbox-warnings/"),
    {
      enabled: Object.keys(payload).length > 0,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
    }
  );
console.log(geneticTestingData, "geneticTestingData");
  // Create a callback that will be invoked in cellRenderer
  const handleWarningClick = useCallback((warnings, toxicityClass) => {
    const filtered = Array.isArray(warnings)
      ? warnings.filter(
          (w) => w && typeof w === 'object' && 'toxicityClass' in w && 
          w.toxicityClass === toxicityClass
        )
      : [];
    setModalData(
      filtered.filter(
        (item) => item && typeof item === 'object' && 
        'warningType' in item && 'toxicityClass' in item
      )
    );
    setOpenModal(true);
  }, []);
  // Create the blackbox cell renderer as a separate function for clarity
  const renderBlackboxCell = useCallback((params) => {
    if (!geneticTestingData?.warning) return "No";
    
    const allDrugs = Object.values(geneticTestingData.warning).flat();
    const drug = allDrugs.find(
      (item) => item && typeof item === 'object' && 'drug' in item && item.drug === params.data.Drug
    );
    
    if (drug && typeof drug === 'object' && 'drugWarnings' in drug && 
        Array.isArray(drug.drugWarnings) && drug.drugWarnings.length > 0) {
      return (
        <div>
          {drug.drugWarnings.map((warning, index) => (
            <span
              key={`${warning.toxicityClass}-${index}`}
              onClick={() => handleWarningClick(drug.drugWarnings, warning.toxicityClass)}
              
            >
              <span className="underline cursor-pointer">{warning.toxicityClass}</span>
              
              {Array.isArray(drug.drugWarnings) && index < drug.drugWarnings.length - 1 ? " | " : ""}
            </span>
          ))}
        </div>
      );
    }
    if (drug && typeof drug === 'object' && 'blackboxWarning' in drug && 'chemblAvailable' in drug) {
      if (!drug.blackboxWarning && !drug.chemblAvailable) {
        return "No data available";
      }
    }
    return "No";
  }, [geneticTestingData, handleWarningClick]);
  // Make sure columnDefs updates when geneticTestingData or renderBlackboxCell changes
  const columnDefs = useMemo(() => [
    {
      field: "Disease",
      cellRenderer: (params) => capitalizeFirstLetter(params.value),
    },
    { field: "Target" },
    { field: "Drug" },
    {
      headerName: "Blackbox warning",
      field: "blackbox",
      cellRenderer: renderBlackboxCell,
    }
  ], [renderBlackboxCell]);
  const visibleColumns = useMemo(
    () => columnDefs.filter((col) => selectedColumns.includes(col.field)),
    [columnDefs, selectedColumns]
  );
  const handleColumnChange = (columns) => {
    setSelectedColumns(columns);
  };
  const filteredData = useMemo(() => {
    if (!approvedDrugData || !Array.isArray(approvedDrugData)) return [];
    const filtered = selectedDisease.includes("All")
      ? approvedDrugData.filter((data) => data.ApprovalStatus === "Approved")
      : approvedDrugData.filter(
          (data) =>
            selectedDisease.some(
              (disease) =>
                disease.toLowerCase() === data.Disease.toLowerCase()
            ) && data.ApprovalStatus === "Approved"
        );
    const uniqueKeys = new Set(
      filtered.map((item) => `${item.Target}-${item.Disease}-${item.Drug}`)
    );
    return Array.from(uniqueKeys).map((key) =>
      filtered.find(
        (item) => `${item.Target}-${item.Disease}-${item.Drug}` === key
      )
    );
  }, [selectedDisease, approvedDrugData]);
  useEffect(() => {
    if (filteredData.length > 0) {
      const payload = createApprovedDrugsPayload(filteredData);
      setPayload(payload);
    }
  }, [filteredData]);
  useEffect(() => {
    if (indications && Array.isArray(indications)) {
      setSelectedDisease(indications);
    }
  }, [indications]);
  const handleDiseaseChange = (value) => {
    if (value.includes("All")) {
      setSelectedDisease(indications || []);
    } else {
      setSelectedDisease(value);
    }
  };
  const showLoading = isFetchingData || loading || geneticTestingIsLoading;
  const groupedRefs = useMemo(() => {
    if (!modalData || !modalData[0] || !modalData[0].references || !Array.isArray(modalData[0].references)) {
      return {};
    }
    
    return modalData[0].references.reduce((acc, ref, index) => {
      const key = ref.source;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...ref, index: index + 1 });
      return acc;
    }, {});
  }, [modalData]);
  return (
    <section id="approvedDrug" className="px-[5vw]">
      <h1 className="text-3xl font-semibold mb-4">Approved Drugs</h1>
      <p className="mt-2 font-medium mb-2">
        List of approved drugs for all the indications
      </p>
      <div className="flex justify-between">
        <div>
          <span>Disease: </span>
          <Select
            showSearch
            style={{ width: 500 }}
            onChange={handleDiseaseChange}
            placeholder="Select Disease"
            value={selectedDisease}
            mode="multiple"
            maxTagCount="responsive"
          >
            <Option value="All">All</Option>
            {indications && indications.map((indication) => (
              <Option key={indication} value={indication}>
                {indication}
              </Option>
            ))}
          </Select>
        </div>
        <ColumnSelector
          allColumns={columnDefs}
          defaultSelectedColumns={selectedColumns}
          onChange={handleColumnChange}
        />
      </div>
      {showLoading && <LoadingButton />}
      {geneticTestingError && !showLoading && (
        <div className="ag-theme-quartz mt-4 h-[50vh] max-h-[280px] flex items-center justify-center">
          <Empty description={`${geneticTestingError}`} />
        </div>
      )}
      {error && !showLoading && (
        <div className="ag-theme-quartz mt-4 h-[50vh] max-h-[280px] flex items-center justify-center">
          <Empty description={`${error}`} />
        </div>
      )}
      {!showLoading && !error && filteredData.length > 0 && (
        <div className="mt-4 mb-10">
          <Table 
            columnDefs={visibleColumns} 
            rowData={filteredData}
            key={geneticTestingData ? "with-data" : "no-data"} // Force table re-render when data changes
          />
        </div>
      )}
      <Modal
        title="Drug Warnings"
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        width={450}
      >
        {modalData && modalData[0] && (
          <div 
      className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100 max-w-md transition-all duration-300 hover:shadow-lg"
      
    >
      {/* Header with toxicity class */}
      <div className="relative p-4" style={{ backgroundColor: `#f59e0b15` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} style={{ color: "#f59e0b" }} />
            <h3 className="font-semibold text-lg text-gray-800">
              Toxicity class: {modalData[0]?.toxicityClass || "Not Available"}
            </h3>
          </div>
          
          {modalData[0]?.efoIdForWarningClass && (
            <a
              href={`https://www.ebi.ac.uk/ols4/search?q=${modalData[0].efoIdForWarningClass}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-full transition-transform duration-400 ease-in-out transform hover:scale-150"
            >
              <ArrowUpRight size={18} className="text-blue-600" />
            </a>
          )}
        </div>
        
        {/* Animated bar below header */}
        <div className="absolute bottom-0 left-0 h-1 transition-all duration-500 ease-in-out" 
          style={{ 
            backgroundColor: "#f59e0b", 
          }} 
        />
      </div>
      
      {/* Content area */}
      <div className="p-4 space-y-4">
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex items-center space-x-2 mb-1">
              <MapPin size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Country</span>
            </div>
            <p className="text-gray-800 font-medium pl-6">{modalData[0]?.country || "N/A"}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex items-center space-x-2 mb-1">
              <BookOpen size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-600">EFO ID</span>
            </div>
            <p className="text-gray-800 font-medium pl-6">{modalData[0]?.efoIdForWarningClass?.split(":")[1] || "N/A"}</p>
          </div>
        </div>
        
        {/* References section */}
        <div className="mt-4">
          <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#f59e0b" }}></div>
            References
          </h4>
          
          <div className="space-y-4">
            {Object.entries(groupedRefs).map(([source, refs]) => (
              <div key={source} className="bg-gray-50 p-3 rounded-md">
                <div className="font-medium text-gray-700 mb-2">{source}</div>
                <div className="flex flex-wrap gap-2">
                  {(refs as Array<any>).map((ref) => (
                    <a
                      key={ref.id}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 bg-white rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors duration-200"
                    >
                      <span className="text-blue-600 text-sm">{ref.index}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
 
  
  
   
      
        )}
      </Modal>
    </section>
  );
};
export default ApprovedDrug
