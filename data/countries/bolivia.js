export const boliviaTaxData = {
  country: 'Bolivia',
  currency: 'BOB',
  lastUpdated: '2026-03-18',
  notes:
    "Prototype dataset for an editable tax folio. National rates are broadly stable, while some departmental and municipal rates can vary by local ordinance or assessed value brackets. Update this file as new official figures become available.",
  sources: [
    {
      label: 'Servicio de Impuestos Nacionales (national taxes overview)',
      url: 'https://www.impuestos.gob.bo/'
    },
    {
      label: 'Bolivia tax summary reference (VAT, corporate income, transactions, RC-IVA)',
      url: 'https://taxsummaries.pwc.com/bolivia/corporate/other-taxes'
    },
    {
      label: 'Municipal tax administration reference (property, vehicles, transfers)',
      url: 'https://www.ruat.gob.bo/'
    }
  ],
  revenueContext: {
    label: 'Illustrative annual collections loaded into the prototype',
    amount: 38253000000,
    coverageNote:
      'This total only includes the taxes listed below with numeric revenue values. It is meant to power the selection sandbox and should be replaced with your preferred official revenue series.'
  },
  groups: [
    {
      id: 'national',
      label: 'National Government',
      type: 'group',
      position: { x: 290, y: 200 },
      description: 'Core taxes administered centrally, mainly through the national tax authority.',
      taxes: [
        {
          id: 'iva',
          label: 'IVA',
          name: 'Impuesto al Valor Agregado',
          rate: '13%',
          revenue: 16840000000,
          position: { x: 140, y: 430 },
          description:
            'Value-added tax applied to sales of goods, services, and imports. The posted nominal rate is 13%.',
          scope: 'National',
          notes: [
            'Broad-based consumption tax and one of the largest revenue sources in Bolivia.',
            'In many practical calculations the embedded effective rate can be expressed differently depending on invoice treatment.'
          ],
          source: 'SIN / PwC tax summary'
        },
        {
          id: 'iue',
          label: 'IUE',
          name: 'Impuesto sobre las Utilidades de las Empresas',
          rate: '25%',
          revenue: 9610000000,
          position: { x: 290, y: 500 },
          description: 'Corporate income tax on company profits.',
          scope: 'National',
          notes: [
            'Standard corporate income tax rate is 25%.',
            'Sector-specific surcharges can exist for certain activities, so this node uses the general rate.'
          ],
          source: 'SIN / PwC tax summary'
        },
        {
          id: 'it',
          label: 'IT',
          name: 'Impuesto a las Transacciones',
          rate: '3%',
          revenue: 5340000000,
          position: { x: 440, y: 430 },
          description:
            'Gross transactions tax generally applied to income from habitual business, trade, profession, or services.',
          scope: 'National',
          notes: [
            'Commonly levied on gross receipts at 3%.',
            'Can interact with IUE credits in some cases.'
          ],
          source: 'SIN / PwC tax summary'
        },
        {
          id: 'rciva',
          label: 'RC-IVA',
          name: 'Régimen Complementario al IVA',
          rate: '13%',
          revenue: 1820000000,
          position: { x: 290, y: 330 },
          description:
            "Complementary regime linked to IVA, commonly affecting employment and certain personal income flows.",
          scope: 'National',
          notes: [
            "Frequently treated as a withholding/creditable mechanism attached to invoice-backed deductions.",
            "This prototype keeps it separate because it matters for explaining Bolivia's tax architecture."
          ],
          source: 'SIN / PwC tax summary'
        }
      ]
    },
    {
      id: 'departmental',
      label: 'Departmental Governments',
      type: 'group',
      position: { x: 600, y: 170 },
      description:
        "Taxes or revenue powers assigned to departmental governments, often narrower than national taxes.",
      taxes: [
        {
          id: 'departmental-gambling',
          label: 'Gaming',
          name: 'Departmental taxes on gambling, games, and lotteries',
          rate: 'Varies by departmental rule / taxable event',
          revenue: 263000000,
          position: { x: 600, y: 390 },
          description:
            "Departments can participate in taxation tied to games of chance and related economic activities under Bolivia's decentralization framework.",
          scope: 'Departmental',
          notes: [
            'Exact design can vary in implementation and should be updated with the department-specific schedule you want to showcase.',
            'This node is intentionally modeled as editable because subnational tax design is less standardized than the main national taxes.'
          ],
          source: 'Editable placeholder based on subnational tax structure'
        }
      ]
    },
    {
      id: 'municipal',
      label: 'Municipal Governments',
      type: 'group',
      position: { x: 930, y: 200 },
      description:
        'Municipal taxes usually focus on property, vehicles, and transfers, with collection handled locally or through RUAT-linked systems.',
      taxes: [
        {
          id: 'imu',
          label: 'Property',
          name: 'Impuesto Municipal a la Propiedad de Bienes Inmuebles',
          rate: 'Progressive / assessed-value based',
          revenue: 2890000000,
          position: { x: 780, y: 430 },
          description:
            'Municipal real-estate property tax based on cadastral or assessed value schedules.',
          scope: 'Municipal',
          notes: [
            'The effective rate depends on valuation bands and municipal rules.',
            'Keep the specific brackets for the municipality you are comparing in this file.'
          ],
          source: 'RUAT / municipal tax practice'
        },
        {
          id: 'imv',
          label: 'Vehicles',
          name: 'Impuesto a la Propiedad de Vehículos Automotores',
          rate: 'Annual schedule by class, age, and value',
          revenue: 1010000000,
          position: { x: 930, y: 500 },
          description:
            'Municipal annual vehicle ownership tax usually calculated from schedules that consider vehicle characteristics.',
          scope: 'Municipal',
          notes: [
            'Tax due varies significantly by vehicle class and depreciation rules.',
            'This is modeled as a schedule-driven node rather than one single flat rate.'
          ],
          source: 'RUAT / municipal tax practice'
        },
        {
          id: 'imt',
          label: 'Transfer',
          name: 'Impuesto Municipal a las Transferencias',
          rate: '3%',
          revenue: 480000000,
          position: { x: 1080, y: 430 },
          description: 'Municipal tax on transfers of real estate and vehicles.',
          scope: 'Municipal',
          notes: [
            'Often presented as a 3% transfer tax on the transaction value or tax base defined by regulation.',
            'Useful for visualizing transactional revenue at the local-government tier.'
          ],
          source: 'RUAT / municipal tax practice'
        }
      ]
    }
  ]
};
