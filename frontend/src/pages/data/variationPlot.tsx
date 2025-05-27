import { useState, useEffect } from "react";
import Plotly from "plotly.js-dist-min";
import LocusZoom from "locuszoom";
import { Select, message, Empty,  Space } from "antd";
import { useQuery } from "react-query";
import { fetchData } from "../../utils/fetchData";
import LoadingButton from "../../components/loading";
import CHROMOSOMES from "./chromosomes.json";

const { Option } = Select;

function DiseasePlot({ diseases }) {
  const [selectedDisease, setSelectedDisease] = useState("");
  const [allPoints, setAllPoints] = useState([]);
  const [mondoId, setMondoId] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [variantOptions, setVariantOptions] = useState([]);
  const [geneOptions, setGeneOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [filterType, setFilterType] = useState("variant"); // Default filter type

  // Reset data on disease change
  useEffect(() => {
    setAllPoints([]);
    setMondoId(null);
    setRawData([]);
    setVariantOptions([]);
    setGeneOptions([]);
    setSelectedOption(null);
  }, [selectedDisease]);

  const handleDiseaseChange = (value) => {
    setSelectedDisease(value);
  };

  const handleFilterTypeChange = (value) => {
    setFilterType(value);
    setSelectedOption(null); // Reset selected option when changing filter type
  };

  const handleOptionChange = (value) => {
    setSelectedOption(value);
    updatePlot(value);
  };

  // Payload for LocusZoom query based on selected disease
  const payload = { diseases: [selectedDisease] };

  const { data: locuszoomData, error: locuszoomError, isLoading: locuszoomLoading } = useQuery(
    ["locuszoom", payload],
    () => fetchData(payload, "/genomics/locus-zoom"),
    {
      enabled: selectedDisease !== "",
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: false,
      
    }
  );

  useEffect(() => {
    if (locuszoomData) {
      if(locuszoomData?.[selectedDisease.toLowerCase()] !== "EFO ID not found for immune-mediated necrotizing myopathy") 
      {
        console.log("LocusZoom Data: frffr pgs catalog", locuszoomData);

        const id = locuszoomData?.[selectedDisease.toLowerCase()]?.split("/").pop();
        setMondoId(id);
      }
    }
  }, [locuszoomData]);

  useEffect(() => {
    if (!mondoId) return;

    const url = `${import.meta.env.VITE_API_URI}/api/download/${mondoId}`;

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        processFileData(text);
      })
      .catch((error) => {
        message.error("Error fetching data for the disease.");
        console.error("Error fetching TSV:", error);
      });
  }, [mondoId]);

  const processFileData = (data) => {
    const rows = data.split("\n").map((row) => row.split("\t"));
    const headers = rows.shift();
    const chrIndex = headers.indexOf("Chromosome");
    const posIndex = headers.indexOf("Position");
    const pvalIndex = headers.indexOf("pvalue");
    const rsidIndex = headers.indexOf("rsID");
    const refAlleleIndex = headers.indexOf("Variant and Risk Allele");
    const authorIndex = headers.indexOf("Author");
    const pubmedidIndex = headers.indexOf("PubMed ID");
    const mappedgeneIndex = headers.indexOf("Mapped gene(s)");
    const reportedtraitIndex = headers.indexOf("Reported trait");

    if (
      [chrIndex, posIndex, pvalIndex, rsidIndex, refAlleleIndex, authorIndex, pubmedidIndex, mappedgeneIndex].includes(
        -1
      )
    ) {
      message.error("Required columns not found in TSV file.");
      return;
    }

    // Process raw data and store it
    const processedRows = rows
      .filter(row => row.length >= headers.length)
      .map(row => ({
        chr: row[chrIndex],
        pos: parseInt(row[posIndex]),
        pval: parseFloat(row[pvalIndex]),
        rsID: row[rsidIndex],
        variant: row[refAlleleIndex],
        author: row[authorIndex],
        pubmedid: row[pubmedidIndex],
        gene: row[mappedgeneIndex],
        reportedtrait: row[reportedtraitIndex],
        logPval: -Math.log10(parseFloat(row[pvalIndex]))
      }));

    setRawData(processedRows);

    // Extract unique variants and genes for filters
    const uniqueVariants = [...new Set(processedRows.map(row => row.variant))].filter(Boolean).sort();;
    const uniqueGenes = [...new Set(
      processedRows.flatMap(row => row.gene ? row.gene.split(', ') : [])
    )].filter(Boolean).sort();

    setVariantOptions(uniqueVariants.map(variant => ({ label: variant, value: variant })));
    setGeneOptions(uniqueGenes.map(gene => ({ label: gene, value: gene })));

    // Store all points for LocusZoom interaction
    setAllPoints(processedRows);

    // Render initial plot with all data
    renderManhattanPlot(processedRows);
  };

  const updatePlot = (value) => {
    if (!value) {
      renderManhattanPlot(rawData);
      return;
    }

    let filteredData = [...rawData];

    // Apply filter based on selected type
    if (filterType === "variant") {
      filteredData = filteredData.filter(row => row.variant === value);
    } else if (filterType === "gene") {
      filteredData = filteredData.filter(row => {
        const genes = row.gene ? row.gene.split(', ') : [];
        return genes.includes(value);
      });
    }

    // Render the plot with filtered data
    renderManhattanPlot(filteredData);
  };

  useEffect(() => {
    if (diseases && diseases.length > 0) {
      setSelectedDisease(diseases[0]);
    }
  }, [diseases]);

  const renderManhattanPlot = (data) => {
    // Convert filtered data to format needed for plotting
    const dataMap = {};
    
    data.forEach((row) => {
      const { chr, pos, logPval, rsID, variant, gene, author, pubmedid, reportedtrait } = row;
      
      if (!dataMap[chr]) {
        dataMap[chr] = { x: [], y: [], text: [], positions: [], locusX: [] };
      }
      
      const chromosome = CHROMOSOMES.chromosomes.find((c) => c.name === chr);
      const location = chromosome ? parseFloat(chromosome?.location.toString()) : 0;
      
      // Calculate x as location + position
      const xValue = location + pos;
      
      dataMap[chr].x.push(xValue);
      dataMap[chr].y.push(logPval);
      dataMap[chr].locusX.push(chr);
      dataMap[chr].text.push(
        `rsID: ${rsID}<br>Chromosome: ${chr}<br>P-value: ${Math.pow(10, -logPval).toExponential(2)}<br>` +
        `Variant and Risk Allele: ${variant}<br>Mapped Gene(s): ${gene}<br>` +
        `Reported Trait: ${reportedtrait}<br>Author: ${author}<br>PubMed ID: ${pubmedid}`
      );
      dataMap[chr].positions.push(pos);
    });
    
    const plotDiv = document.getElementById("plot");
    if (!plotDiv) return;
    
    Plotly.purge(plotDiv);
    
    const traces = Object.keys(dataMap).map((chr) => ({
      x: dataMap[chr].x,
      y: dataMap[chr].y,
      mode: "markers",
      type: "scatter",
      name: `Chr ${chr}`,
      text: dataMap[chr].text,
      hoverinfo: "text",
      marker: { size: 8 },
      customdata: dataMap[chr].positions,
      locusX: dataMap[chr].locusX,
    }));

    const layout = {
      title: {
        text: "Manhattan Plot with Variant Details",
      },
      xaxis: {
        title: {
          text: "Chromosome",
        },
        tickvals: CHROMOSOMES.chromosomes.map((d) => d.location + d.length / 2),
        ticktext: CHROMOSOMES.chromosomes.map((d) => d.name),
      },
      shapes: [
        {
          type: 'line',
          x0: 0,
          x1: 3199026875,
          y0: 8,
          y1: 8,
          line: {
            color: 'grey',
            dash: 'dash',
            width: 2,
            length: 1
          },
        },
      ],
      yaxis: {
        title: {
          text: "-log10(p-value)",
        },
      },
      hovermode: "closest",
      showlegend: false,
    };

    Plotly.newPlot(plotDiv, traces, layout).then((plot) => {
      plot.on("plotly_click", function (data) {
        const point = data.points[0];
        const chr = point.data.locusX[point.pointIndex];
        const pos = point.customdata[point.pointIndex];
        const matchedPoint = allPoints.find(p => p.chr === chr && p.pos === pos);
        const rsID = matchedPoint?.rsID || "Unknown";
        renderLocusZoom(chr, pos, rsID);
      });
    });
  };

  const renderLocusZoom = (chr, pos, rsID) => {
    const apiBase = "https://portaldev.sph.umich.edu/api/v1/";
    const data_sources = new LocusZoom.DataSources()
      .add("assoc", [
        "AssociationLZ",
        {
          url: apiBase + "statistic/single/",
          source: 45,
          id_field: "variant",
        },
      ])
      .add("ld", ["LDServer", { url: "https://portaldev.sph.umich.edu/ld/" }])
      .add("recomb", [
        "RecombLZ",
        { url: apiBase + "annotation/recomb/results/", build: "GRCh37" },
      ])
      .add("gene", [
        "GeneLZ",
        { url: apiBase + "annotation/genes/", build: "GRCh37" },
      ])
      .add("constraint", [
        "GeneConstraintLZ",
        { url: "https://gnomad.broadinstitute.org/api/", build: "GRCh37" },
      ]);

    const layout = LocusZoom.Layouts.get("plot", "standard_association", {
      state: {
        genome_build: "GRCh38",
        chr,
        start: pos - 50000,
        end: pos + 50000,
        highlight: rsID,
      },
      axes: {
        x: {
          label: "Genomic Position",
        },
        y1: {
          label: "-log10(p-value)",
        },
      },
    });
    
    const lzPlot = document.getElementById("lz-plot");
    if (lzPlot) {
      LocusZoom.populate("#lz-plot", data_sources, layout);
    }
  };



  // Get the current options based on filter type
  const getCurrentOptions = () => {
    return filterType === "variant" ? variantOptions : geneOptions;
  };

  return (
    <div>
      <h2 className="text-xl subHeading font-semibold mb-3 mt-4" id="manhattanPlot">Manhattan Plot</h2>
      <p className="my-1 font-medium">
        A genome-wide visualization of SNP significance, highlighting risk loci in GWAS. Click on a specific variant to view the 'LocusZoom plot'.
      </p>
      
      <div className="flex flex-wrap gap-2 mt-4">
        <div className="flex items-center">
          <span className="mr-1">Disease:</span>
          <Select
            style={{ width: 500 }}
            placeholder="Select a disease"
            onChange={handleDiseaseChange}
            value={selectedDisease}
            loading={locuszoomLoading}
          >
            {diseases.map((disease) => (
              <Option key={disease} value={disease}>
                {disease}
              </Option>
            ))}
          </Select>
        </div>
        
        {(variantOptions.length > 0 || geneOptions.length > 0) && (
          <div className="flex items-center ml-4">
            <span className="mr-1">Filter: </span>
            <Space.Compact >
              <Select 
                style={{ width: 200 }}
                value={filterType}
                onChange={handleFilterTypeChange}
                options={[
                  { value: 'variant', label: 'Variant and risk allele' },
                  { value: 'gene', label: 'Gene' }
                ]}
              />
              <Select
                style={{ width: 250 }}
                placeholder={`Select ${filterType}`}
                onChange={handleOptionChange}
                value={selectedOption}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
                
                options={getCurrentOptions()}
              />
            </Space.Compact>
            
            
          </div>
        )}
      </div>

      {locuszoomLoading && <LoadingButton />}
      {locuszoomError && <Empty description="Failed to load data" />}
      {!locuszoomLoading && !locuszoomError && locuszoomData?.[selectedDisease.toLowerCase()] === null && (
        <div className="h-[40vh] flex justify-center items-center">
          <Empty description="No data available" />
        </div>
      )}
      {locuszoomData?.[selectedDisease.toLowerCase()] === "EFO ID not found for immune-mediated necrotizing myopathy" && (
        <div className="h-[40vh] flex justify-center items-center">
          <Empty description="No data available" />
        </div>
      )}


      {!locuszoomLoading && !locuszoomError && locuszoomData?.[selectedDisease.toLowerCase()] && locuszoomData?.[selectedDisease.toLowerCase()] !== "EFO ID not found for immune-mediated necrotizing myopathy" && (
        <div>
          <div
            id="plot"
            style={{ width: "100%", height: "400px", marginTop: "20px" }}
          ></div>
          <div id="lz-plot" style={{ marginTop: "20px" }}></div>
        </div>
      )}
    </div>
  );
}

export default DiseasePlot;