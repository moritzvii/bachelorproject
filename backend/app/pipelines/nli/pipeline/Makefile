PYTHON ?= python3
PIPELINE_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
PREPROCESSING_ROOT := $(PIPELINE_ROOT)/../preprocessing
DATA_ROOT := $(abspath $(PIPELINE_ROOT)/../../../data/nli)
REPORT_SCRIPT := report_pipeline.py

PIPELINE_STAGES := input-strategy strategy-hypotheses forecast-retrieval forecast-nli forecasts-nli risk-hybrid-report merge-pairs user-review-mean scoring-summary scoring-interval
PREPROCESSING := preprocess-build-parquets preprocess-merge-premises preprocess-transform-forecasts preprocess-transform-risks
EMBEDDING_INDEXES := build-forecast-index build-risk-index
RISK_UTILS := risk-factors-config

.PHONY: all pipeline preprocess embeddings embedding risk-setup $(PIPELINE_STAGES) $(PREPROCESSING) $(EMBEDDING_INDEXES) $(RISK_UTILS)

all: pipeline

pipeline:
	@cd "$(PIPELINE_ROOT)" && $(PYTHON) $(REPORT_SCRIPT)

preprocess: $(PREPROCESSING)
embeddings: preprocess-transform-forecasts preprocess-merge-premises $(EMBEDDING_INDEXES)
embedding: embeddings
risk-setup: $(RISK_UTILS)

define SCRIPT_RULE
.PHONY: $(1)
$(1):
	@printf '%s\n' "-> Running $(1)"
	@cd "$(PIPELINE_ROOT)" && $(PYTHON) "$(2)"
endef

define PREPROCESS_RULE
.PHONY: $(1)
$(1):
	@printf '%s\n' "-> Running $(1)"
	@cd "$(PREPROCESSING_ROOT)" && $(PYTHON) "$(2)"
endef

$(eval $(call PREPROCESS_RULE,preprocess-build-parquets,forecast-statista/build_parquets_and_premises.py))
$(eval $(call PREPROCESS_RULE,preprocess-merge-premises,merge_premises.py))
$(eval $(call PREPROCESS_RULE,preprocess-transform-forecasts,forecast/parquet-transformer.py))
$(eval $(call PREPROCESS_RULE,preprocess-transform-risks,risks/parquet-transformer.py))
$(eval $(call SCRIPT_RULE,input-strategy,1-UserInput/input_strategy.py))
$(eval $(call SCRIPT_RULE,strategy-hypotheses,2-Hypothesen/strategy_hypotheses.py))
$(eval $(call PREPROCESS_RULE,build-forecast-index,embeddings/build_forecast_index.py))
$(eval $(call PREPROCESS_RULE,build-risk-index,embeddings/build_risk_index.py))
$(eval $(call SCRIPT_RULE,forecast-retrieval,3-Embeddings/Forecast-Retrieve/retrieve_candidates.py))
$(eval $(call SCRIPT_RULE,risk-retrieval,3-Embeddings/Risk-Retrieve/retrieve_candidates.py))
$(eval $(call SCRIPT_RULE,risk-hybrid-report,4-PremisePairs/risk-reports/risk_nli_simple.py))
$(eval $(call SCRIPT_RULE,forecasts-nli,4-PremisePairs/forecasts/nli_forecasts.py))
$(eval $(call SCRIPT_RULE,risk-factors-config,4-PremisePairs/risk-reports/factors/risk_factors_config_kg.py))
$(eval $(call SCRIPT_RULE,forecast-nli,4-PremisePairs/forecast-reports/nli_premise_pairs.py))
$(eval $(call SCRIPT_RULE,merge-pairs,5-Reports/merge_pairs.py))
$(eval $(call SCRIPT_RULE,user-review-mean,6-UserReview/add_user_status.py))
$(eval $(call SCRIPT_RULE,scoring-summary,7-Scoring/score_summary.py))
$(eval $(call SCRIPT_RULE,scoring-interval,7-Scoring/intervall.py))

.PHONY: clean-workdir
clean-workdir:
	@echo "-> Removing all /out directories under app/data/nli/workdir"
	@find "$(DATA_ROOT)/workdir" \
		-path "$(DATA_ROOT)/workdir/0-preprocessing" -prune -o \
		-type d -name "out" -prune -exec rm -rf {} +
