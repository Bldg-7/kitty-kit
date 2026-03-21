export interface TrackingCategory {
  id: string;
  name: string;
  params: string[];
}

export const categories: TrackingCategory[] = [
  {
    id: 'utm',
    name: 'UTM',
    params: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    params: ['fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source'],
  },
  {
    id: 'google',
    name: 'Google',
    params: ['gclid', 'gclsrc', 'gbraid', 'wbraid', 'dclid'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    params: ['ttclid', 'tt_medium', 'tt_content'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    params: ['msclkid', 'mkt_tok'],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    params: ['hsa_cam', 'hsa_grp', 'hsa_mt', 'hsa_src', 'hsa_ad', 'hsa_acc', 'hsa_net', 'hsa_ver', 'hsa_la', 'hsa_ol', 'hsa_kw', 'hsa_tgt'],
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    params: ['mc_cid', 'mc_eid'],
  },
  {
    id: 'misc',
    name: 'Other',
    params: [
      '_ga', '_gl', '_ke', '_kx',
      'ref', 'referrer',
      'igshid',
      'yclid',
      'twclid',
      'li_fat_id',
      'spm', 'scm',
      'vero_id',
      'wickedid',
      'oly_anon_id', 'oly_enc_id',
      's_kwcid', 'ef_id',
      'trk', 'trkCampaign', 'trkInfo',
    ],
  },
];

export function getAllParams(
  categoryStates: Record<string, boolean>,
  customParams: string[],
): string[] {
  const params: string[] = [];
  for (const cat of categories) {
    if (categoryStates[cat.id] !== false) {
      params.push(...cat.params);
    }
  }
  params.push(...customParams);
  return [...new Set(params)];
}
