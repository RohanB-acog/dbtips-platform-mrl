import { Select } from "antd";
import { useState, useEffect } from "react";

const { Option } = Select;

/**
 * Reusable disease filter component that can be used across multiple files
 * Shows all disease data by default and handles "All" selection
 * 
 * @param {Object} props - Component props
 * @param {string[]} props.allDiseases - All available diseases/indications
 * @param {string[]} props.selectedDiseases - Currently selected diseases (defaults to all diseases)
 * @param {Function} props.onChange - Callback when selection changes
 * @param {boolean} props.disabled - Whether the select is disabled
 * @param {number} props.width - Width of the select component (in px)
 * @param {boolean} props.showLabel - Whether to show the "Disease:" label
 * @param {string} props.labelText - Custom label text (defaults to "Disease:")
 * @param {string} props.placeholder - Placeholder text for the select
 */
const DiseaseFilter = ({
  allDiseases = [],
  selectedDiseases,
  onChange,
  disabled = false,
  width = 500,
  showLabel = true,
  labelText = "Disease:",
  placeholder = "Select indications",
}) => {
  // Internal state for selected values
  const [internalSelected, setInternalSelected] = useState(
    selectedDiseases || [...allDiseases]
  );
  
  // Update internal state when allDiseases or selectedDiseases props change
  useEffect(() => {
    // If selectedDiseases prop is explicitly provided, use it
    if (selectedDiseases) {
      setInternalSelected(selectedDiseases);
    } 
    // Otherwise, if allDiseases changes and no explicit selection, default to all
    else if (allDiseases.length > 0) {
      setInternalSelected([...allDiseases]);
      // Notify parent component that all diseases are selected by default
      if (onChange) {
        onChange([...allDiseases]);
      }
    }
  }, [allDiseases, selectedDiseases]);
  
  // Handle select change event
  const handleSelectChange = (value) => {
    let newSelection;
    
    // Special handling for "All" option
    if (value.includes("All")) {
      // Check if "All" was just added (meaning it wasn't there before)
      if (!value.some(v => v === "All" && internalSelected.includes(v))) {
        // Select all diseases and remove the "All" value itself
        newSelection = [...allDiseases];
      } else {
        // Just in case "All" was already there, keep actual selection
        newSelection = value.filter(v => v !== "All").length > 0 
          ? value.filter(v => v !== "All") 
          : [...allDiseases];
      }
    } else {
      // Normal selection (no "All" involved)
      newSelection = [...value];
    }
    
    // Update internal state
    setInternalSelected(newSelection);
    
    // Notify parent component
    if (onChange) {
      onChange(newSelection);
    }
  };
  
 // Calculate display value for the Select component
const getDisplayValue = () => {
  // Check if all diseases are selected
  const allSelected = allDiseases.length > 0 &&
    allDiseases.every(disease => internalSelected.includes(disease));

  if (allSelected) {
    return [...allDiseases]; // 👈 Return full list, not ["All"]
  }

  return internalSelected;
};


  return (
    <div className="flex items-center">
      {showLabel && <span className="mr-2">{labelText}</span>}
      <Select
        style={{ width }}
        onChange={handleSelectChange}
        mode="multiple"
        value={getDisplayValue()}
        disabled={disabled}
        showSearch={false}
        placeholder={placeholder}
        maxTagCount="responsive"
        defaultActiveFirstOption={true}
      >
        <Option value="All">All</Option>
        {allDiseases.map((disease) => (
          <Option key={disease} value={disease}>
            {disease}
          </Option>
        ))}
      </Select>
    </div>
  );
};

export default DiseaseFilter;