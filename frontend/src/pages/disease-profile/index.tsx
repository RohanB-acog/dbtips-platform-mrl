import { useState, useEffect } from 'react';
import Description from "./description";
import { useLocation } from 'react-router-dom';
import { parseQueryParams } from '../../utils/parseUrlParams';
import Ontology from "./ontology";
import GeneticTestingRegistery from './geneticTestingRegistry';
const DiseaseProfile = () => {
	const location = useLocation();

	const [indications, setIndications] = useState([]);
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const {  indications } = parseQueryParams(queryParams);
		setIndications(indications);
	}, [location]);
		console.log(indications);
	return <div>
		<Description  indications={indications} />
		<Ontology indications={indications} />
		<div className='px-[5vw] py-10' id ="diagnostics" >
			<h1 className="text-3xl font-semibold mb-3">
				Diagnostics and biomarkers
			</h1>
		<GeneticTestingRegistery indications={indications} />
		</div>
	</div>;
};

export default DiseaseProfile;
