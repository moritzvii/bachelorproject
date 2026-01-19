export type Segment = {
    company_ticker: string
    fiscal_year: number
    fiscal_quarter: string
    segment_code: string
    segment_name: string
    currency: string
    unit: string
    revenue: number | null
    operating_income: number | null
    change_percent: number | null
    units_sold: string | null
    source_doc_id: string
    source_type: string
    source_page: string | null
    effective_date: string | null
    restated: boolean
    revision: number | null
}
