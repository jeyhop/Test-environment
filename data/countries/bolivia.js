export const boliviaTaxData = {
  country: 'Bolivia',
  currency: 'BOB',
  lastUpdated: '2026-03-18',
  revenueContext: {
    label: 'Loaded annual revenue total for this Bolivia prototype',
    amount: 38253000000
  },
  groups: [
    {
      id: 'national',
      label: 'National Government',
      glyph: '✦',
      position: { x: 640, y: 380 },
      taxes: [
        {
          id: 'iva',
          label: 'IVA',
          glyph: 'V',
          name: 'Impuesto al Valor Agregado',
          rate: '13%',
          revenue: 16840000000,
          position: { x: 350, y: 210 }
        },
        {
          id: 'iue',
          label: 'IUE',
          glyph: 'U',
          name: 'Impuesto sobre las Utilidades de las Empresas',
          rate: '25%',
          revenue: 9610000000,
          position: { x: 930, y: 230 }
        },
        {
          id: 'it',
          label: 'IT',
          glyph: 'T',
          name: 'Impuesto a las Transacciones',
          rate: '3%',
          revenue: 5340000000,
          position: { x: 420, y: 585 }
        },
        {
          id: 'rciva',
          label: 'RC-IVA',
          glyph: 'R',
          name: 'Régimen Complementario al IVA',
          rate: '13%',
          revenue: 1820000000,
          position: { x: 915, y: 540 }
        }
      ]
    },
    {
      id: 'departmental',
      label: 'Departmental Governments',
      glyph: '◆',
      position: { x: 1070, y: 360 },
      taxes: [
        {
          id: 'departmental-gambling',
          label: 'Gaming',
          glyph: 'G',
          name: 'Departmental taxes on gambling, games, and lotteries',
          rate: 'Varies',
          revenue: 263000000,
          position: { x: 1225, y: 155 }
        }
      ]
    },
    {
      id: 'municipal',
      label: 'Municipal Governments',
      glyph: '⬢',
      position: { x: 970, y: 680 },
      taxes: [
        {
          id: 'imu',
          label: 'Property',
          glyph: 'P',
          name: 'Impuesto Municipal a la Propiedad de Bienes Inmuebles',
          rate: 'Progressive',
          revenue: 2890000000,
          position: { x: 710, y: 775 }
        },
        {
          id: 'imv',
          label: 'Vehicles',
          glyph: 'C',
          name: 'Impuesto a la Propiedad de Vehículos Automotores',
          rate: 'Schedule',
          revenue: 1010000000,
          position: { x: 1160, y: 770 }
        },
        {
          id: 'imt',
          label: 'Transfer',
          glyph: 'M',
          name: 'Impuesto Municipal a las Transferencias',
          rate: '3%',
          revenue: 480000000,
          position: { x: 1260, y: 550 }
        }
      ]
    }
  ]
};
