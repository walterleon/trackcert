import { createPathComponent } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Inject custom cluster styles (dark theme, no default green/yellow look)
if (typeof document !== 'undefined' && !document.getElementById('cluster-custom-css')) {
  const style = document.createElement('style');
  style.id = 'cluster-custom-css';
  style.textContent = `
    .marker-cluster {
      background: rgba(59,130,246,.25) !important;
      border: 2px solid rgba(59,130,246,.6) !important;
    }
    .marker-cluster div {
      background: rgba(59,130,246,.7) !important;
      color: #fff !important;
      font-weight: 600 !important;
      font-size: 13px !important;
    }
    .marker-cluster-small {
      background: rgba(59,130,246,.2) !important;
    }
    .marker-cluster-medium {
      background: rgba(245,158,11,.25) !important;
      border-color: rgba(245,158,11,.6) !important;
    }
    .marker-cluster-medium div {
      background: rgba(245,158,11,.7) !important;
    }
  `;
  document.head.appendChild(style);
}

type ClusterOptions = L.MarkerClusterGroupOptions & { children?: React.ReactNode };

const MarkerClusterGroup = createPathComponent<L.MarkerClusterGroup, ClusterOptions>(
  (props, ctx) => {
    const { children: _children, ...options } = props;
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 35,
      spiderfyDistanceMultiplier: 2,
      ...options,
    });
    return {
      instance: clusterGroup,
      context: { ...ctx, layerContainer: clusterGroup },
    };
  }
);

export default MarkerClusterGroup;
