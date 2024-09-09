import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { parse } from 'json2csv';

@Injectable()
export class RecoverdataService {
  constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

  async generateCsv(country: string, startDate: string, endDate: string): Promise<Buffer> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date format. Expected format: YYYY-MM-DD');
      }

      const formattedStartDate = start.toISOString().split('T')[0]; 
      const formattedEndDate = end.toISOString().split('T')[0];

      const query = `
        SELECT
          s.country AS "Market",
          s.store_code AS "Store Code",
          s.store_name AS "Store Name",
          COALESCE(
              (
                  SELECT COUNT(customer_code)
                  FROM customers
                  WHERE store_code = s.store_code
                    AND created_by_app = '1'
                    AND CAST(created_at AS timestamp) BETWEEN $2 AND $3
              ) +
              (
                  SELECT COUNT(id)
                  FROM beauty_consultations
                  WHERE store_code = s.store_code
                    AND CAST(bc_date AS timestamp) BETWEEN $2 AND $3
              ) +
              (
                  SELECT COUNT(id)
                  FROM beauty_prescriptions
                  WHERE store_code = s.store_code
                    AND CAST(bp_date AS timestamp) BETWEEN $2 AND $3
              ) +
              (
                  SELECT COUNT(DISTINCT ticket_reference)
                  FROM paid_tickets
                  WHERE store_code = s.store_code
                    AND CAST(date AS timestamp) BETWEEN $2 AND $3
              ) +
              (
                  SELECT COUNT(DISTINCT ticket_reference)
                  FROM baskets
                  WHERE store_code = s.store_code
                    AND CAST(date AS timestamp) BETWEEN $2 AND $3
              ) +
              (
                  SELECT COUNT(id)
                  FROM contact_history
                  WHERE store_code = s.store_code
                    AND CAST(contact_date AS timestamp) BETWEEN $2 AND $3
              ),
              0
          ) AS "Total Activity",
          COALESCE(
              (
                  SELECT COUNT(DISTINCT user_id)
                  FROM (
                      SELECT creation_bc AS user_id
                      FROM customers
                      WHERE store_code = s.store_code
                        AND created_by_app = '1'
                      UNION
                      SELECT advisor_code AS user_id
                      FROM beauty_consultations
                      WHERE store_code = s.store_code
                      UNION
                      SELECT advisor_code AS user_id
                      FROM beauty_prescriptions
                      WHERE store_code = s.store_code
                      UNION
                      SELECT ba_code AS user_id
                      FROM paid_tickets
                      WHERE store_code = s.store_code
                      UNION
                      SELECT ba_code AS user_id
                      FROM baskets
                      WHERE store_code = s.store_code
                      UNION
                      SELECT advisor_code AS user_id
                      FROM contact_history
                      WHERE store_code = s.store_code
                  ) AS users
              ),
              0
          ) AS "Nb of Active Users",
          COALESCE(
              (
                  SELECT COUNT(DISTINCT customer_code)
                  FROM transactions t
                  WHERE total_paid_price > '0'
                    AND t.store_code = s.store_code
                    AND CAST(transaction_date AS timestamp) BETWEEN $2 AND $3
              ),
              0
          ) AS "Nb of Active Customers"
        FROM
          stores s
        WHERE
          s.country = $1;
      `;

      const result = await this.entityManager.query(query, [country, formattedStartDate, formattedEndDate]);

      const csvData = parse(result, {
        fields: [
          { label: 'Market', value: 'Market' },
          { label: 'Store Code', value: 'Store Code' },
          { label: 'Store Name', value: 'Store Name' },
          { label: 'Total Activity', value: 'Total Activity' },
          { label: 'Nb of Active Users', value: 'Nb of Active Users' },
          { label: 'Nb of Active Customers', value: 'Nb of Active Customers' }
        ],
        header: true,
      });

      const bomCsvData = `\ufeff${csvData}`;

      return Buffer.from(bomCsvData, 'utf-8');

    } catch (error) {
      throw new BadRequestException('Error generating CSV: ' + error.message);
    }
  }
}
