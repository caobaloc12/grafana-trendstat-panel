import _ from 'lodash';
import $ from 'jquery';
import 'jquery.flot';
// import 'jquery.flot.gauge';
// import 'app/features/panellinks/link_srv';
import './css/trendstat-panel.css!';

import kbn from 'app/core/utils/kbn';
// import config from 'app/core/config';
import TimeSeries from 'app/core/time_series2';
import {
  MetricsPanelCtrl
} from 'app/plugins/sdk';

class TrendStatCtrl extends MetricsPanelCtrl {

  /** @ngInject */
  constructor($scope, $injector, $location) {
    super($scope, $injector);

    // Set and populate defaults
    var panelDefaults = {
      links: [],
      datasource: null,
      maxDataPoints: 100,
      interval: null,
      targets: [{}],
      cacheTimeout: null,
      format: 'none',
      nullText: null,
      nullPointMode: 'connected',
      valueName: 'current',
      valueFontSize: '20px',
      percentFontSize: '16px',
      thresholds: '',
      colorBackground: false,
      colorValue: false,
      colors: ['#299c46', 'rgba(237, 129, 40, 0.89)', '#d44a3a'],
      sparkline: {
        show: false,
        full: false,
        lineColor: 'rgb(31, 120, 193)',
        fillColor: 'rgba(31, 118, 189, 0.18)',
      },
    };

    _.defaults(this.panel, panelDefaults);

    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));

    this.onSparklineColorChange = this.onSparklineColorChange.bind(this);
    this.onSparklineFillChange = this.onSparklineFillChange.bind(this);
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/trendstat-panel/editor.html', 2);
    this.unitFormats = kbn.getUnitFormats();
  }

  setUnitFormat(subItem) {
    this.panel.format = subItem.value;
    this.refresh();
  }

  onDataError(err) {
    this.onDataReceived([]);
  }

  onDataReceived(dataList) {
    const data = {};
    // if (dataList.length > 0 && dataList[0].type === 'table') {
    //   this.dataType = 'table';
    //   const tableData = dataList.map(this.tableHandler.bind(this));
    //   this.setTableValues(tableData, data);
    // } else {
    //   this.dataType = 'timeseries';
    //   this.series = dataList.map(this.seriesHandler.bind(this));
    //   this.setValues(data);
    // }

    this.series = dataList.map(this.seriesHandler.bind(this));
    this.setValues(data);
    this.data = data;
    this.render();
  }

  seriesHandler(seriesData) {
    var series = new TimeSeries({
      datapoints: seriesData.datapoints || [],
      alias: seriesData.target,
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }
  /*
    setTableColumnToSensibleDefault(tableData) {
      if (this.tableColumnOptions.length === 1) {
        this.panel.tableColumn = this.tableColumnOptions[0];
      } else {
        this.panel.tableColumn = _.find(tableData.columns, col => {
          return col.type !== 'time';
        }).text;
      }
    }

    setTableValues(tableData, data) {
      if (!tableData || tableData.length === 0) {
        return;
      }

      if (tableData[0].length === 0 || tableData[0][0][this.panel.tableColumn] === undefined) {
        return;
      }

      const datapoint = tableData[0][0];
      data.value = datapoint[this.panel.tableColumn];

      if (_.isString(data.value)) {
        data.valueFormatted = _.escape(data.value);
        data.value = 0;
        data.valueRounded = 0;
      } else {
        const decimalInfo = this.getDecimalsForValue(data.value);
        const formatFunc = kbn.valueFormats[this.panel.format];
        data.valueFormatted = formatFunc(
          datapoint[this.panel.tableColumn],
          decimalInfo.decimals,
          decimalInfo.scaledDecimals
        );
        data.valueRounded = kbn.roundValue(data.value, this.panel.decimals || 0);
      }

      this.setValueMapping(data);
    } */

  setColoring(options) {
    if (options.background) {
      this.panel.colorValue = false;
      this.panel.colors = ['rgba(71, 212, 59, 0.4)', 'rgba(245, 150, 40, 0.73)', 'rgba(225, 40, 40, 0.59)'];
    } else {
      this.panel.colorBackground = false;
      this.panel.colors = ['rgba(50, 172, 45, 0.97)', 'rgba(237, 129, 40, 0.89)', 'rgba(245, 54, 54, 0.9)'];
    }
    this.render();
  }

  invertColorOrder() {
    var tmp = this.panel.colors[0];
    this.panel.colors[0] = this.panel.colors[2];
    this.panel.colors[2] = tmp;
    this.render();
  }

  onColorChange(panelColorIndex) {
    return color => {
      this.panel.colors[panelColorIndex] = color;
      this.render();
    };
  }

  onSparklineColorChange(newColor) {
    this.panel.sparkline.lineColor = newColor;
    this.render();
  }

  onSparklineFillChange(newColor) {
    this.panel.sparkline.fillColor = newColor;
    this.render();
  }

  getDecimalsForValue(value) {
    if (_.isNumber(this.panel.decimals)) {
      return {
        decimals: this.panel.decimals,
        scaledDecimals: null
      };
    }

    var delta = value / 2;
    var dec = -Math.floor(Math.log(delta) / Math.LN10);

    var magn = Math.pow(10, -dec),
      norm = delta / magn, // norm is between 1.0 and 10.0
      size;

    if (norm < 1.5) {
      size = 1;
    } else if (norm < 3) {
      size = 2;
      // special case for 2.5, requires an extra decimal
      if (norm > 2.25) {
        size = 2.5;
        ++dec;
      }
    } else if (norm < 7.5) {
      size = 5;
    } else {
      size = 10;
    }

    size *= magn;

    // reduce starting decimals if not needed
    if (Math.floor(value) === value) {
      dec = 0;
    }

    var result = {};
    result.decimals = Math.max(0, dec);
    result.scaledDecimals = result.decimals - Math.floor(Math.log(size) / Math.LN10) + 2;

    return result;
  }

  setValues(data) {
    data.flotpairs = [];

    if (this.series.length > 1) {
      var error = new Error();
      error.message = 'Multiple Series Error';
      error.data =
        'Metric query returns ' +
        this.series.length +
        ' series. Single Stat Panel expects a single series.\n\nResponse:\n' +
        JSON.stringify(this.series);
      throw error;
    }

    if (this.series && this.series.length > 0) {
      let lastPoint = _.last(this.series[0].datapoints);
      let lastValue = _.isArray(lastPoint) ? lastPoint[0] : null;
      data.value = this.series[0].stats[this.panel.valueName];
      data.flotpairs = this.series[0].flotpairs;

      let decimalInfo = this.getDecimalsForValue(data.value);
      let formatFunc = kbn.valueFormats[this.panel.format];

      let latestPoint = _.last(this.series[0].datapoints);
      let oldestPoint = _.first(this.series[0].datapoints);
      let latestValue = _.isArray(latestPoint) ? latestPoint[0] : null;
      let oldestValue = _.isArray(oldestPoint) ? oldestPoint[0] : null;

      data.oldestValue = formatFunc(oldestValue, decimalInfo.decimals, decimalInfo.scaledDecimals);;
      data.percentValue = (latestValue && oldestValue) ? changePercent(oldestValue, latestValue) : 'N/A';
      data.valueFormatted = formatFunc(data.value, decimalInfo.decimals, decimalInfo.scaledDecimals);
      data.valueRounded = kbn.roundValue(data.value, decimalInfo.decimals);

      // Add $__name variable for using in prefix or postfix
      data.scopedVars = _.extend({}, this.panel.scopedVars);
      data.scopedVars['__name'] = {
        value: this.series[0].label
      };
    }
    // this.setValueMapping(data);
  }

  link(scope, elem, attrs, ctrl) {
    var $location = this.$location;
    // var linkSrv = this.linkSrv;
    var $timeout = this.$timeout;
    var panel = ctrl.panel;
    var templateSrv = this.templateSrv;
    var data, linkInfo;
    var $panelContainer = elem.find('.panel-container');
    elem = elem.find('.trendstat-panel');

    function applyColoringThresholds(value, valueString) {
      if (!panel.colorValue) {
        return valueString;
      }

      var color = getColorForValue(data, value);
      if (color) {
        return '<span style="color:' + color + '">' + valueString + '</span>';
      }

      return valueString;
    }

    function getSpan(className, fontSize, value) {
      value = templateSrv.replace(value, data.scopedVars);
      return '<span class="' + className + '" style="font-size:' + fontSize + '">' + value + '</span>';
    }

    function getBigValueHtml() {
      var body = '<div class="trendstat-panel-value-container">';

      var value = applyColoringThresholds(data.value, data.valueFormatted);
      body += getSpan('trendstat-panel-value', panel.valueFontSize, value);
      
      var pctExplain = 'It was ' + data.oldestValue + ' last ' + ctrl.range.raw.from.split('-')[1] + ' at this time.';
      var pctElement = '<a href="#" class="trendstat-panel-pct" style="font-size:' + panel.percentFontSize + '" title="'+ pctExplain +'" >' + data.percentValue + '</a>';

      body += pctElement;

      body += '</div>';
      return body;
    }

    function addSparkline() {
      var width = elem.width() + 20;
      if (width < 30) {
        // element has not gotten it's width yet
        // delay sparkline render
        setTimeout(addSparkline, 30);
        return;
      }

      var height = ctrl.height;
      var plotCanvas = $('<div></div>');
      var plotCss = {};
      plotCss.position = 'absolute';
      plotCss.bottom = '1px';
      debugger;
      
      if (panel.sparkline.full) {
        plotCss.left = '0px';
        plotCss.width = width - 10 + 'px';
        var dynamicHeightMargin = height <= 100 ? 5 : Math.round(height / 100) * 15 + 5;
        plotCss.height = height - dynamicHeightMargin + 'px';
      } else {
        plotCss.left = '5px';
        plotCss.width = width - 10 + 'px';
        plotCss.height = Math.floor(height * 0.25) + 'px';
      }

      plotCanvas.css(plotCss);

      var options = {
        legend: {
          show: false
        },
        series: {
          lines: {
            show: true,
            fill: 1,
            lineWidth: 1,
            fillColor: panel.sparkline.fillColor,
          },
        },
        yaxes: {
          show: false
        },
        xaxis: {
          show: false,
          mode: 'time',
          min: ctrl.range.from.valueOf(),
          max: ctrl.range.to.valueOf(),
        },
        grid: {
          hoverable: false,
          show: false
        },
      };

      elem.append(plotCanvas);

      var plotSeries = {
        data: data.flotpairs,
        color: panel.sparkline.lineColor,
      };

      $.plot(plotCanvas, [plotSeries], options);
    }

    function render() {
      if (!ctrl.data) {
        return;
      }
      data = ctrl.data;

      // get thresholds
      if (panel.thresholds) {
        data.thresholds = panel.thresholds.split(',').map(function (strVale) {
          return Number(strVale.trim());
        });
      }
      data.colorMap = panel.colors;

      var body = getBigValueHtml();

      if (panel.colorBackground) {
        var color = getColorForValue(data, data.value);
        if (color) {
          $panelContainer.css('background-color', color);
          if (scope.fullscreen) {
            elem.css('background-color', color);
          } else {
            elem.css('background-color', '');
          }
        }
      } else {
        $panelContainer.css('background-color', '');
        elem.css('background-color', '');
      }

      elem.html(body);

      if (panel.sparkline.show) {
        addSparkline();
      }

      // if (panel.gauge.show) {
      //   addGauge();
      // }

      elem.toggleClass('pointer', panel.links.length > 0);

      // if (panel.links.length > 0) {
      //   linkInfo = linkSrv.getPanelLinkAnchorInfo(panel.links[0], data.scopedVars);
      // } else {
      //   linkInfo = null;
      // }
    }

    function hookupDrilldownLinkTooltip() {
      // drilldown link tooltip
      var drilldownTooltip = $('<div id="tooltip" class="">hello</div>"');
      elem.mouseleave(function () {
        if (panel.links.length === 0) {
          return;
        }
        $timeout(function () {
          drilldownTooltip.detach();
        });
      });

      elem.click(function (evt) {
        if (!linkInfo) {
          return;
        }
        // ignore title clicks in title
        if ($(evt).parents('.panel-header').length > 0) {
          return;
        }

        if (linkInfo.target === '_blank') {
          window.open(linkInfo.href, '_blank');
          return;
        }

        if (linkInfo.href.indexOf('http') === 0) {
          window.location.href = linkInfo.href;
        } else {
          $timeout(function () {
            $location.url(linkInfo.href);
          });
        }

        drilldownTooltip.detach();
      });

      elem.mousemove(function (e) {
        if (!linkInfo) {
          return;
        }

        drilldownTooltip.text('click to go to: ' + linkInfo.title);
        drilldownTooltip.place_tt(e.pageX, e.pageY - 50);
      });
    }

    hookupDrilldownLinkTooltip();

    this.events.on('render', function () {
      render();
      ctrl.renderingCompleted();
    });
  }
}

function getColorForValue(data, value) {
  if (!_.isFinite(value)) {
    return null;
  }
  for (var i = data.thresholds.length; i > 0; i--) {
    if (value >= data.thresholds[i - 1]) {
      return data.colorMap[i];
    }
  }
  return _.first(data.colorMap);
}

function changePercent(oldestValue, latestValue) {
  var change = latestValue - oldestValue;
  var pct = parseFloat(100 * (latestValue - oldestValue) / oldestValue).toFixed(1);
  pct = pct > 0 ? '+' + pct : pct;
  return pct + '%';
}

export {
  TrendStatCtrl,
  TrendStatCtrl as PanelCtrl,
  getColorForValue
};

TrendStatCtrl.templateUrl = 'module.html';
