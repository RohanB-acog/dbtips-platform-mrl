import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { parseQueryParams } from "../../utils/parseUrlParams";
import DiseasePathways from "./diseasePathways";
import Literature from "./literature";
import TargetLiterature from "./targetLiterature";
import TargetPerturbation from "./targetPertubation";

const Evidence = () => {
  const location = useLocation();
  const [indications, setIndications] = useState([]);
  const [target, setTarget] = useState("");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const { indications, target } = parseQueryParams(queryParams);
    setIndications(indications);
    setTarget(target?.split("(")[0]);
  }, [location]);

  const hasIndications = indications?.length > 0;
  const showTargetLiterature = target && (hasIndications || !hasIndications);
  const showDiseasePathways = hasIndications; // Only show if there are indications

  return (
    <div className="evidence-page mt-8">
      {showTargetLiterature ? (
        <TargetLiterature target={target} indications={indications} />
      ) : (
        <Literature indications={indications} />
      )}
      
      {showDiseasePathways && <DiseasePathways indications={indications} target={target} />}
      
      {showTargetLiterature && <TargetPerturbation target={target} />}
    </div>
  );
};

export default Evidence;
