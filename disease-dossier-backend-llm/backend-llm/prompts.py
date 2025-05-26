rnaseq_all_indications_summary_prompt ="""
Please analyze the rnaseq data on multiple diseases {rnaseq_disease} provided and summarize it by 
`Understanding the Data`
- Use your knowledge of multiple diseases to assess the relevance of the datasets.
- Identify which datasets (eg: scRNA, bulk RNA, microarray) are most useful for finding therapeutic targets across diseases.
`Analyzing Patterns in Samples`
- Examine sample types (tissue or cell types) and sequencing methods to:
i) Identify potential therapeutic targets, or
ii) Understand disease mechanisms.
- Highlight tissue types common to multiple diseases across the datasets.
`Generating Actionable Insights`
- Summarize the most relevant datasets and tissue types for studying one or multiple diseases, focusing on target identification and indication expansion.
- Highlight key insights from datasets that are applicable across diseases.
- Use prior knowledge to offer insights that speed up target identification for drug discovery and development.
- Ensure the summary is based on a thorough analysis of the `ENTIRE DATASET`, without limiting the focus to a subset such as the top rows, to provide comprehensive and accurate conclusions.
"""

rnaseq_data_summary_prompt = """
Please analyze the rnaseq data provided and summarize it by:

- Integrating key insights from datasets  most relevant to target identification in {rnaseq_disease} for a biopharma scientist
- Analyzing the pattern of samples and sequencing methods and the inferences gained in context of either potential therapeutic targets or understanding disease mechanism
- Integrate prior knowledge about {rnaseq_disease} to understand the relevance of the datasets provided.

Integrating these with key insights that assist the scientist in target identification for a disease or multiple disease using common pathways, please generate a summary that includes
- Most relevant datasets for analysis from a biopharma target identification and indication expansion perspective.
- Prior knowledge driven insights that accelerate the scientists work in target identification from a drug discovery and development for one or multiple disease standpoint.
- Ensure the summary is based on a thorough analysis of the ENTIRE DATASET, without limiting the focus to a subset such as the top rows, to provide comprehensive and accurate conclusions.
"""

animal_models_summary_prompt="""
Please analyze the data provided on model organism studies or relevance to the disease {animal_models_disease} and summarize it by:

- Integrating key insights from models most relevant to elucidating disease mechanism in {animal_models_disease} for a biopharma scientist 
- Analyze the commonalities and differences in model organisms in context of disease mechanism 
- Integrate prior knowledge about {animal_models_disease} to understand the relevance of the model organisms specifically in context of therapeutic target identification for the disease. 

Integrating these with key insights that assist the scientist in target identification for a disease or multiple disease using common pathways, please generate a summary that includes 
- Model organisms most relevant to study for the biopharma scientist in context of target identification and indication expansion. 
- Prior knowledge driven insights that accelerate the scientists work in target identification from a drug discovery and development for one or multiple disease standpoint. 
- Ensure the summary is based on a thorough analysis of the `ENTIRE DATASET`, without limiting the focus to a subset such as the top rows, to provide comprehensive and accurate conclusions.
"""


pipeline_indications_summary_prompt="""
Please analyze and summarize the pipeline by indications data provided on a list of known drugs for the disease {pipeline_indications_disease} by:

- Integrating key insights from drug-target pairs in higher phase trials for a disease
- Analyzing the pattern of targets to find most common type of target (a receptor or ion channel or cytokine etc), the pathways involved, the  modalities and overall status.
- Integrate prior knowledge about {pipeline_indications_disease} to understand the diversity of targets from the list provided Integrating these with key insights that assist the scientist in target identification for a disease or multiple disease using common pathways.
The summary should include 
- Key highlights including the nature of the targets and pathways of relevance to target across multiple diseases. 
- A list of drugs in Phase 3 completed or Phase 4 trials that are approved in one disease but of relevance to other diseases.
- Prior knowledge driven insights that accelerate the scientists work in target identification from a drug discovery and development for one or multiple disease standpoint.
- Ensure the summary is based on a thorough analysis of the `ENTIRE DATASET`, without limiting the focus to a subset such as the top rows, to provide comprehensive and accurate conclusions.
"""

pipeline_indications_all_summary_pompt ="""
Please analyze and summarize the pipeline by indications data provided on a list of known drugs for the multiple diseases {pipeline_indications_disease} by:
`Understand the Data`
- Combine your knowledge of multiple diseases to assess the relevance of the datasets.
- Highlight target-disease pairs that are:
i) Approved,
ii) In ongoing trials, or
iii) Closely aligned with disease mechanisms.
`Analyze Therapeutic Targets`
- Examine the nature of therapeutic targets, modalities, and their connection to disease mechanisms across one or more diseases.
- Identify targets being actively studied based on trial statuses and outcomes.
`Generate Actionable Insights`
- Highlight the most relevant target-disease pairs for biopharma target identification and indication expansion.
- Identify key insights from:
i) Approved targets,
ii) Targets in trials spanning multiple diseases,
iii) Promising targets not yet in trials but relevant across diseases.
- Summarize learnings from failed, terminated, or withdrawn trials.
- Leverage prior knowledge to accelerate target identification for drug discovery and development.
- Ensure the summary is based on a thorough analysis of the `ENTIRE DATASET`, without limiting the focus to a subset such as the top rows, to provide comprehensive and accurate conclusions.
"""

literature_summary_prompt="""
Consider yourself as an assistant to a biomedical and biotech scientist involved in target identification at a pharmaceutical company. Analyze the {literature_diseases} provided and provide a summary that includes the following
=> Disease relevant pathways
=> Key events such as phenotypes, cell types and cellular process
=> Topmost targets under study with rationale behind thier mechanism of action
When looking at literatures across multiple diseases, also include the following
=> Shared anatomical or pathological features across {literature_diseases}
=> Shared pathways, cell types, phenotypes and targets of interest in therapeutic context 

Please refer to the following sources for information:
{literature_urls}

**Important Instructions**:
- You must use the data from these references to provide a detailed response.
"""

patient_stories_prompt = """
You have been provided with the patient stories data as {patient_stories_data} related to a disease.
Please analyze and summarize the patient stories section for the disease by:
    - Providing  insights into the challenges faced by patients, their treatment experiences, and how they navigated the healthcare system.
    - Highlight unmet needs or gaps in current treatments, guiding product development and marketing strategies
    - Highlight key benefits, challenges, and successes associated with a treatment

**Important Instructions**:
- You must use the data from this reference to provide a detailed response to the users' question if the answer is not clear or available from the refernce you can use your knowledge to answer it without any false information or hallucinations.
"""

gwas_summary_prompt = """
Please analyze and summarize the GWAS Studies data as {gwas_data} and GWAS Associations data as {gwas_data1} of a disease.
`Understand the Data`
For  `disease' from the {gwas_data}, You have to generate summary which includes the following:
    - Evaluate the {gwas_data} and {gwas_data1} and merge them by disease and summarize it to give a comprehensive overview of the genetic landscape: 
    i) focus on the different traits studied in the disease, across different ethnic groups and their reported sample size and number of studies.
    ii) Help me prioritise the top gene/proteins (based on number of variants in the gene and lowest p value) as potential biomarkers/ putative targets for the disease. 
    iii) Emphasise on the role of the top associated genes in each disease and its implications for developing therapeutic modalities in the future.
    
**Important Instructions**:
- Don't describe the columns and sample rows of the data in the summary.
- You must use the data from this reference to provide a detailed response.
"""

gwas_summary_all_prompt = """
Please analyze and summarize the GWAS Studies data as {gwas_data} and GWAS Associations data as {gwas_data1} of multiple diseases.
`Understand the Data`
- List all the unique diseases from the {gwas_data},
- For 'each unique disease' from the {gwas_data}, You have to report the disease wise summary which includes the following:
    - Evaluate the {gwas_data} and {gwas_data1} and merge them by disease and summarize it to give a comprehensive overview of the genetic landscape for `each unique disease` : 
    i) focus on the different traits studied in the disease, across different ethnic groups and their reported sample size and number of studies.
    ii) Help me prioritise the top gene/proteins (based on number of variants in the gene and lowest p value) as potential biomarkers/ putative targets for the disease. 
    iii) Emphasise on the role of the top associated genes in each disease and its implications for developing therapeutic modalities in the future.
    
**Important Instructions**:
- Ensure the summary is generated for all the unique diseases mentioned in the refernece.
- Don't describe the columns and sample rows of the data in the summary.
- You must use the data from this reference to provide a detailed response.
"""

pipeline_target_summary_prompt="""
Please analyze pipeline by target data and summarize it to deliver a comprehensive overview of the {pipeline_target_target}'s landscape:
- From the dataset, focus on describing the biological role of {pipeline_target_target} and its association with {pipeline_target_diseases}, including its mechanism of action and the therapeutic modalities being investigated, such as small molecules, biologics, or gene therapies
"""

target_literature_summary_prompt="""
Can you provide mechanistic insights into the role of {literature_target} in the pathogenesis of {literature_diseases}? Specifically, what pathways, biological processes, and cell types are implicated? Are there shared mechanisms across these diseases, and where do they converge or diverge in terms of immune response, tissue remodeling, or disease progression?

Please refer to the following sources for information:
{literature_urls}

**Important Instructions**:
- You must use the data from these references to provide a detailed response.
"""

PROMPT_TEMPLATES = {
    "rnaseq": rnaseq_data_summary_prompt.strip(),
    "literature": literature_summary_prompt.strip(),
    "pipeline_indications": pipeline_indications_summary_prompt.strip(),
    "animal_models": animal_models_summary_prompt.strip(),
    "rnaseq_all": rnaseq_all_indications_summary_prompt.strip(),
    "pipeline_indications_all":pipeline_indications_all_summary_pompt.strip(),
    "patient_stories": patient_stories_prompt.strip(),
    "gwas": gwas_summary_prompt.strip(),
    "gwas_all": gwas_summary_all_prompt.strip(),
    "pipeline_target": pipeline_target_summary_prompt.strip(),
    "target_literature": target_literature_summary_prompt.strip()

}

# Common format instructions
FORMAT_INSTRUCTIONS = """
In addition, identify key topics from the data and prior knowledge, and suggest a list of questions for further exploration. This should not be part of above summary.

You must use the following format for your response only for this question and should not be used for follow up questions:
{format_instructions}
"""

def get_prompt_for_datasets(selected_datasets,context_variables):
    # Handle single widget case
    if len(selected_datasets) == 1:
        dataset = selected_datasets[0]
        if dataset in PROMPT_TEMPLATES:
            if 'disease' in context_variables[dataset]:
                # Perform the length check if 'disease' exists
                prompt = PROMPT_TEMPLATES[f"{dataset}_all"] if len(context_variables[dataset]['disease']) > 1 else PROMPT_TEMPLATES[dataset]
            else:
                # If 'disease' does not exist, use the dataset prompt directly
                prompt = PROMPT_TEMPLATES[dataset]
            return f"{prompt}"
        else:
            raise ValueError(f"Unknown dataset: {dataset}")

    # Handle multiple widgets
    combined_prompt = """
Please analyze and summarize the provided datasets by integrating key insights from each dataset, highlighting synergies, differences, and their combined implications. The analysis aims to assist a biopharma scientist in therapeutic target identification, disease understanding, and drug discovery.
"""

    # Add prompts for each selected widget
    for dataset in selected_datasets:
        if dataset in PROMPT_TEMPLATES:
            if 'disease' in context_variables[dataset]:
                prompt = PROMPT_TEMPLATES[f"{dataset}_all"] if len(context_variables[dataset]['disease']) > 1 else PROMPT_TEMPLATES[dataset]
            else:
                prompt = PROMPT_TEMPLATES[dataset]
            combined_prompt += f"\n{prompt}\n"
        else:
            raise ValueError(f"Unknown dataset: {dataset}")

    # Add cross-dataset integration
    combined_prompt += """
**Cross-Dataset Integration:**
- Identify synergies or conflicts between the selected datasets:
  - How do the insights from different datasets complement or contrast with each other?
  - Are there shared pathways or targets that stand out across all datasets?
  - How does integrating these datasets advance understanding of therapeutic target identification and drug discovery?

**Unified Summary:**
- Provide a cohesive summary of the combined datasets, focusing on:
  - Key insights relevant to therapeutic target identification.
  - Disease mechanism understanding and potential indication expansion.
  - Prior knowledge-driven insights that accelerate drug discovery.
"""

    # Append format instructions
    # combined_prompt += f"\n{FORMAT_INSTRUCTIONS}"
    return combined_prompt


# selected_datasets = ["animal_models", "pipeline_indications"]
# selected_datasets = ["animal_models"]

# prompt = get_prompt_for_datasets(selected_datasets)
# print(prompt)