// Flattens a nested JSON object
export const flattenJson = (y, parentKey = '', sep = '.') => {
	let items = [];
	Object.keys(y).forEach((k) => {
		if (k === '__typename') return; // Skip typename fields
		const newKey = parentKey ? `${parentKey}${sep}${k}` : k;
		if (typeof y[k] === 'object' && !Array.isArray(y[k]) && y[k] !== null) {
			// Recursively flatten objects
			items = items.concat(Object.entries(flattenJson(y[k], newKey, sep)));
		} else if (Array.isArray(y[k])) {
			// Handle array elements, check if elements are non-object types
			y[k].forEach((item, i) => {
				if (typeof item === 'object' && item !== null) {
					// Recursively flatten if the item is an object
					items = items.concat(
						Object.entries(flattenJson(item, `${newKey}${sep}${i}`, sep))
					);
				} else {
					// Directly assign non-object items
					items.push([`${newKey}${sep}${i}`, item]);
				}
			});
		} else {
			items.push([newKey, y[k]]);
		}
	});
	return Object.fromEntries(items);
};

const getMatchingKeys = (flatItem, column) => {
	const matchingKeys = Object.keys(flatItem).filter(
		(flatKey) => flatKey.startsWith(`${column}.`) || flatKey === column
	);
	let value = matchingKeys.length ? flatItem[matchingKeys[0]] : '';

	if (typeof value === 'string' && value.includes(',')) {
		value = value.split(',').join('|');
	}

	return value;
};

// converts json to csv
export const jsonToCsv = (
	jsonData,
	columns,
	columnMapping = {},
	delimiter = '\t'
) => {
	if (!jsonData || jsonData.length === 0) {
		return 'No data available';
	}
	const flattenedData = jsonData?.map((item) => flattenJson(item));

	console.log(flattenedData);

	const headers = columns.map((col) => columnMapping[col] || col);
	const header = headers.join(delimiter);

	const rows = flattenedData.map((flatItem) => {
		return columns
			.map((col) => {
				return getMatchingKeys(flatItem, col);
			})
			.join(delimiter);
	});
	const csvData = [header, ...rows].join('\n');
	return csvData;
};

export const preprocessIndicationsData = (data) => {
	// Columns for Indications Data
	const columns = [
		'Disease',
		'Target',
		'Trial Ids',
		'Drug',
		'Type',
		'Mechanism of Action',
		'OutcomeStatus',
		'Phase',
		'Status',
		'Sponsor',
	];

	const escapeCsvField = (field) => {
		if (field) {
			return `"${field.replace(/"/g, '""')}"`;
		}
		return '';
	};

	const jsonToCsv = (jsonData, columns, delimiter = ',') => {
		if (!jsonData || jsonData.length === 0) {
			return 'No data available';
		}

		const rows = jsonData.map((entry) => {
			return [
				escapeCsvField(entry['Disease'] || ''),
				escapeCsvField(entry['Target'] || ''),
				escapeCsvField(entry['Source URLs']?.join(' | ') || ''),
				escapeCsvField(entry['Drug'] || ''),
				escapeCsvField(entry['Type'] || ''),
				escapeCsvField(entry['Mechanism of Action'] || ''),
				entry['OutcomeStatus'] || '',
				entry['Phase'] || '',
				escapeCsvField(entry['Status'] || ''),
				escapeCsvField(entry['Sponsor'] || ''),
			].join(delimiter);
		});

		return [columns.join(delimiter), ...rows].join('\n');
	};

	return jsonToCsv(data, columns, ',');
};

export const preprocessAnimalmodelData = (data) => {
	console.log(data);
	const columns = [
		'Model',
		'Gene',
		'Species',
		'ExperimentalCondition',
		'Association',
		'Evidence',
		'References',
	];
	const columnMapping = {
		Model: 'Model',
		Gene: 'GenePerturbed',
		Species: 'Species',
		ExperimentalCondition: 'ExperimentalCondition',
		Association: 'Association',
		Evidence: 'Evidence',
		References: 'References',
	};
	// console.log(jsonToCsv(data, columns));
	return jsonToCsv(data, columns, columnMapping);
};

export const preprocessRnaseqData = (data) => {
	// console.log('rnaseq llm data', dummydata);
	const columns = [
		'GseID',
		'Disease',
		'Title',
		'Summary',
		'Platform',
		'Design',
		'Organism',
		'StudyType',
		'SampleID',
		'TissueType',
		'Characteristics',
	];

	const jsonToCsv = (jsonData, columns, delimiter = ',') => {
		if (!jsonData || jsonData.length === 0) {
			return 'No data available';
		}

		const escapeCsvField = (field) => {
			if (field === undefined || field === null) {
				return '';
			}
			const fieldStr = String(field);
			if (/[,"\n]/.test(fieldStr)) {
				return `"${fieldStr.replace(/"/g, '""')}"`;
			}
			return fieldStr;
		};

		const rows = jsonData.flatMap((entry) => {
			const {
				GseID,
				Disease,
				Title,
				Summary,
				Platform,
				Design,
				Organism,
				StudyType,
				Samples,
			} = entry;

			return Samples.map((sample) => {
				const { SampleID, TissueType, Characteristics } = sample;

				return [
					GseID || '',
					Disease || '',
					escapeCsvField(Title?.join(' | ') || ''),
					escapeCsvField(Summary || ''),
					escapeCsvField(
						Object.entries(Platform || {})
							.map(([key, value]) => `${key}: ${value}`)
							.join(' | ') || ''
					),
					escapeCsvField(Design?.join(' | ') || ''),
					escapeCsvField(Organism?.join(', ') || ''),
					StudyType || '',
					SampleID || '',
					escapeCsvField(TissueType || ''),
					escapeCsvField(Characteristics?.join(' | ') || ''),
				].join(delimiter); // Use the specified delimiter
			});
		});

		return [columns.join(delimiter), ...rows].join('\n');
	};

	let answer = jsonToCsv(data, columns, ',');

	// console.log(answer);

	return answer;
};
export const preprocessPatientData = (data) => {
	const columns = [
	  "Disease",
	  "title",
	  "description",
	  "published_date",
	  "name",
	  "current_age",
	  "onset_age",
	  "sex",
	  "location",
	  "symptoms",
	  "duration_seconds",
	  "view_count",
	  "channel_name",
	  "medical_history_of_patient",
	  "family_medical_history",
	  "challenges_faced_during_diagnosis",
	  "url",
	];
  
	const escapeCsvField = (field) => {
	  if (field) {
		return `"${field.replace(/"/g, '""')}"`;
	  }
	  return "";
	};
  
	const jsonToCsv = (jsonData, columns, delimiter = ",") => {
	  if (!jsonData || jsonData.length === 0) {
		return "No data available";
	  }
  
	  const rows = jsonData.map((entry) => {
		const {
		  Disease,
		  title,
		  description,
		  published_date,
		  name,
		  current_age,
		  onset_age,
		  sex,
		  location,
		  symptoms,
		  duration_seconds,
		  view_count,
		  channel_name,
		  medical_history_of_patient,
		  family_medical_history,
		  challenges_faced_during_diagnosis,
		  
		  url,
		 
		} = entry;
  
		return [
		  escapeCsvField(Disease || ""),
		  escapeCsvField(title || ""),
		  escapeCsvField(description || ""),
		  escapeCsvField(published_date || ""),
		  escapeCsvField(name || ""),
		  escapeCsvField(current_age || ""),
		  escapeCsvField(onset_age || ""),
		  escapeCsvField(sex || ""),
		  escapeCsvField(location || ""),
		  escapeCsvField(symptoms || ""),
		  escapeCsvField(duration_seconds || ""),
		  escapeCsvField(channel_name || ""),
		  escapeCsvField(medical_history_of_patient || ""),
		  escapeCsvField(family_medical_history || ""),
		  escapeCsvField(challenges_faced_during_diagnosis || ""),
		  
		  escapeCsvField(url || ""),
  
		  
		  view_count|| "",
		].join(delimiter);
	  });
  
	  return [columns.join(delimiter), ...rows].join("\n");
	};
	return jsonToCsv(data, columns, ",");
  };
export const preprocessLiteratureData = (data) => {
	const columns = [
		'Disease',
		'PubMedLink',
		'PublicationType',
		'Qualifers',
		'Title',
		'Year',
		"Authors",
		"citedby",
	];

	const escapeCsvField = (field) => {
		if (field) {
			return `"${field.replace(/"/g, '""')}"`; // Escape double quotes
		}
		return '';
	};

	// CSV transformation logic
	const jsonToCsv = (jsonData, columns, delimiter = ',') => {
		if (!jsonData || jsonData.length === 0) {
			return 'No data available';
		}

		const rows = jsonData.map((entry) => {
			const { Disease, PubMedLink, PublicationType, Qualifers, Title, Year,Authors, citedby } =
				entry;

			return [
				escapeCsvField(Disease || ''),
				escapeCsvField(PubMedLink || ''),
				escapeCsvField(PublicationType?.join(' | ') || ''),
				escapeCsvField(Qualifers?.join(' | ') || ''),
				escapeCsvField(Authors?.join(' | ') || ''),
				citedby || '',
				escapeCsvField(Title || ''),
				Year || '',
			].join(delimiter);
		});

		return [columns.join(delimiter), ...rows].join('\n');
	};

	// Generate the CSV output
	const csvData = jsonToCsv(data, columns, ',');

	// console.log('Processed Literature CSV:', csvData);

	return csvData;
};

export const preprocessGWASStudiesData = (data) => {
	console.log("data preprrocess",data);
	const columns = [
		"Disease",
"First author",
"Study accession",
"pubDate",
"Journal",
"Title",
"Reported traits",
"Trait(s)",
"Discovery sample ancestry",
"Replication sample ancestry",
"Association count",
"Summary statistics",
	]
	const escapeCsvField = (field) => {
		if (field) {
			return `"${field.replace(/"/g, '""')}"`; // Escape double quotes
		}
		return '';
	};
	const jsonToCsv = (jsonData, columns, delimiter = ',') => {
		if (!jsonData || jsonData.length === 0) {
			return 'No data available';
		}

		const rows = jsonData.map((entry) => {
			const { disease,pubDate } =
				entry;

			return [
				escapeCsvField(disease || ''),
				escapeCsvField(entry["First author"] || ''),
				escapeCsvField(entry["Study accession"] || ''),
				pubDate || '',
				escapeCsvField(entry["Journal"] || ''),
				escapeCsvField(entry["Title"] || ''),
				escapeCsvField(entry["Reported traits"] || ''),
				escapeCsvField(entry["Trait(s)"] || ''),
				escapeCsvField(entry["Discovery sample ancestry"]?.join(" | ") || ''),
				escapeCsvField(entry["Summary statistics"] || ''),
				entry["Association count"] || '',
				
				
			].join(delimiter);
		});

		return [columns.join(delimiter), ...rows].join('\n');
	};
	// Generate the CSV output
	const csvData = jsonToCsv(data, columns, ',');

	// console.log('Processed Literature CSV:', csvData);

	return csvData;

}
export const preprocessAssociationData = (data) => {
	const columns = [
		'diseaseName',
		'Study Accession',
		'Variant and Risk Allele',
		'pvalue',
		'RAF',
		'CI',
		'OR or BETA',
		'Mapped gene(s)'
	];
	const escapeCsvField = (field) => {
		if (field) {
			return `"${field.replace(/"/g, '""')}"`; // Escape double quotes
		}
		return '';
	};
	const jsonToCsv = (jsonData, columns, delimiter = ',') => {
		if (!jsonData || jsonData.length === 0) {
			return 'No data available';
		}

		const rows = jsonData.map((entry) => {
			const { diseaseName } = entry;

			return [
				escapeCsvField(diseaseName || ''),
				escapeCsvField(entry["Study Accession"] || ''),
				escapeCsvField(entry["Variant and Risk Allele"] || ''),
				entry["pvalue"] || '',
				entry["RAF"] || '',
				entry["CI"] || '',
				entry["OR or BETA"] || '',
				escapeCsvField(entry["Mapped gene(s)"] || ''),
			].join(delimiter);
		});

		return [columns.join(delimiter), ...rows].join('\n');
	};
const csvData = jsonToCsv(data, columns, ',');

	// console.log('Processed Literature CSV:', csvData);

	return csvData;
}