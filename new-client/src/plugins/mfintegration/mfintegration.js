import React from "react";
import PropTypes from "prop-types";
import BaseWindowPlugin from "../BaseWindowPlugin";
import Observer from "react-event-observer";
import RepeatIcon from "@material-ui/icons/Repeat";
import IntegrationModel from "./IntegrationModel";
import IntegrationView from "./IntegrationView";
import SearchModel from "./SearchModel";

const defaultOptions = {
  title: "EDP integration",
  panelDescription: "Integrera med EDP Vision",
  target: "control",
  position: "right",
  visibleAtStart: false,
  instruction:
    "Detta verktyg används för att hantera kartobjekt som har en koppling till EDP Vision.",
  listFeatureFillColor: "rgba(0,0,255,0.07)",
  listFeatureStrokeColor: "rgba(0,0,255,0.5)",
  selectedListFeatureFillColor: "rgba(200,40,255,0.5)",
  selectedListFeatureStrokeColor: "rgba(200,40,255,1)",
  unsavedFeatureFillColor: "rgba(100, 220, 50, 0.25)",
  unsavedFeatureStrokeColor: "rgba(100, 220, 50, 1)",
  editFeatureFillColor: "rgba(255,0,0,0.07)",
  editFeatureStrokeColor: "rgba(255,0,0,0.5)",
};

class MFIntegration extends React.PureComponent {
  state = {
    color: null,
    title: this.props.options.title ?? defaultOptions.title,
    description:
      this.props.options.panelDescription ?? defaultOptions.panelDescription,
  };

  static propTypes = {
    app: PropTypes.object.isRequired,
    map: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.localObserver = Observer();
    this.globalObserver = props.app.globalObserver;
    this.optionsWithDefaults = this.mapDefaultOptions(props.options);

    this.searchModel = new SearchModel({
      localObserver: this.localObserver,
      app: props.app,
      map: props.map,
    });

    this.model = new IntegrationModel({
      localObserver: this.localObserver,
      app: props.app,
      map: props.map,
      searchModel: this.searchModel,
      options: this.mapDefaultOptions(props.options),
    });
  }

  onWindowShow = () => {
    this.model.handleWindowOpen();
  };

  onWindowHide = () => {
    this.model.handleWindowClose();
  };

  mapDefaultOptions = (options) => {
    //start with the default options, and then replace any that have an option given in config.So we can later be sure that we have
    //reasonable default values, and can use props.options without checking everything to see if it exists.
    let mappedOptions = defaultOptions;
    let optionsFields = Object.keys(defaultOptions);

    for (const [key, value] of Object.entries(options)) {
      if (optionsFields.includes(key)) {
        mappedOptions[key] = value;
      }
    }
    return mappedOptions;
  };

  render() {
    return (
      <BaseWindowPlugin
        {...this.props}
        type="mfintegration"
        custom={{
          icon: <RepeatIcon />,
          title: this.state.title,
          color: this.state.color,
          description: this.state.description,
          height: 800,
          width: 500,
          onWindowShow: this.onWindowShow,
          onWindowHide: this.onWindowHide,
        }}
      >
        <IntegrationView
          app={this.props.app}
          model={this.model}
          options={this.mapDefaultOptions(this.props.options)}
          localObserver={this.localObserver}
          globalObserver={this.globalObserver}
          title={this.state.title}
        />
      </BaseWindowPlugin>
    );
  }
}

export default MFIntegration;