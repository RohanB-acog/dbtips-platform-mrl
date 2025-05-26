import {useState, useEffect, useMemo} from 'react'
import Table from "../../components/testTable";
import { useQuery } from 'react-query';
import { fetchData } from '../../utils/fetchData';
import LoadingButton from '../../components/loading';
import { Empty } from 'antd';
import { Select } from 'antd';
import ColumnSelector from '../../components/columnFilter';
import ExportButton from '../../components/testExportButton';
const { Option } = Select;
import { convertToArray } from '../../utils/helper';
const PatientAdvocacyGroup = ({indications}) => {
	const [selectedDisease, setSelectedDisease] = useState(indications);
	const [selectedColumns, setSelectedColumns] = useState([
		'disease',
		'name',
		'country',
		'contact',
	]);
	const columnDefs = [
		{
			field:"disease",
			headerName:"Disease"
		},
		{
			field:"name",
			headerName:"Name",
			cellRenderer:(params)=>{
				return (
					<a href ={params.data.url} target="_blank">
							{params.value}
					</a>
				)
			}
		},
		{field:"country",
		headerName:"Country"
		},
		
		{	headerName:"Contact",
			field:"contact"
		},

		
	]
	const visibleColumns = useMemo(() => {
		return columnDefs.filter((col) => selectedColumns.includes(col.field));
	}, [columnDefs, selectedColumns]);

	const handleColumnChange = (columns: string[]) => {
		setSelectedColumns(columns);
	};

    const payload = {
		diseases: indications,
	};
    useEffect(() => {
		setSelectedDisease(indications);
	}, [indications]);
    const { data, error, isLoading } = useQuery(['patientAdvocacyGroup',payload], 
        () => fetchData( payload,'/market-intelligence/patient_advocacy_group/'), {
            enabled: !!indications.length,
            refetchOnWindowFocus: false,
			staleTime: 5 * 60 * 1000,
			refetchOnMount: false,
            }
            );  
    const processedData = useMemo(() => {
		if (data) {
			return convertToArray(data);
		}
		return [];
	}, [data]);
    const rowData = useMemo(() => {
		if (processedData.length > 0) {
		  // If all diseases are selected (length matches total indications)
		  return selectedDisease.length === indications.length
			? processedData
			: processedData.filter((row) =>
				selectedDisease.some(indication => 
				  indication.toLowerCase() === row.Disease.toLowerCase()
				)
			  );
		}
		return [];
	  }, [processedData, selectedDisease]);
      const handleSelect = (value: string[]) => {
		if (value.includes('All')) {
		  // If "All" is selected, select all diseases but don't include "All" in display
		  setSelectedDisease(indications);
		} else if (selectedDisease.length === indications.length && value.length < indications.length) {
		  // If coming from "all selected" state and deselecting, just use the new selection
		  setSelectedDisease(value);
		} else {
		  // Normal selection behavior
		  setSelectedDisease(value);
		}
	  };

  return (
    <div className='px-[5vw] py-10' id="patientAdvocacyGroup">
        <h1 className='text-3xl font-semibold my-3'>Patient advocacy groups</h1>
        <div className='flex justify-between mb-3'>
					<div>
						<span className='mt-10 mr-1'>Disease: </span>
						<span>
							<Select
								style={{ width: 500 }}
								onChange={handleSelect}
								mode='multiple'
								maxTagCount='responsive'
								value={selectedDisease}
								disabled={isLoading}
								showSearch={false}
							>
								<Option value='All'>All</Option>
								{indications.map((indication) => (
									<Option key={indication} value={indication}>
										{indication}
									</Option>
								))}
							</Select>
						</span>
					</div>
					<div className='flex gap-2'>

					<ColumnSelector
									allColumns={columnDefs}
									defaultSelectedColumns={selectedColumns}
									onChange={handleColumnChange}
								/>
					<ExportButton endpoint="/market-intelligence/patient_advocacy_group/" fileName='PatientAdvocacyGroup' indications={indications} />
					</div>
				</div>
        <div >
    {isLoading && <LoadingButton />}
    {!isLoading && error && 
	<Empty description={`${error}`} />}
       { data && <Table rowData={rowData} columnDefs={visibleColumns} />}
        </div>
    </div>
  )
}

export default PatientAdvocacyGroup