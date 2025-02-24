import React, { useState } from 'react';
import { Alert, Modal, TextInput, TouchableOpacity, View, ScrollView, Text } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';

const DynamicGraphs = ({ visible, onClose, onAddGraph }) => {
  const [step, setStep] = useState(1); // 1: graph selection, 2: data input
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [graphTitle, setGraphTitle] = useState('');
  const [dataPoints, setDataPoints] = useState([{ label: '', value: '' }]);
  
  const graphTypes = [
    { type: 'bar', title: 'Bar Chart', icon: '📊' },
    { type: 'pie', title: 'Pie Chart', icon: '🥧' },
    { type: 'line', title: 'Line Chart', icon: '📈' }
  ];

  const addDataPoint = () => {
    setDataPoints([...dataPoints, { label: '', value: '' }]);
  };

  const updateDataPoint = (index, field, value) => {
    const newData = [...dataPoints];
    newData[index] = { ...newData[index], [field]: value };
    setDataPoints(newData);
  };

  const handleSubmit = () => {
    if (!graphTitle.trim()) {
      Alert.alert('Error', 'Please enter a graph title');
      return;
    }

    const isDataValid = dataPoints.every(point => 
      point.label.trim() && !isNaN(point.value) && point.value.trim()
    );

    if (!isDataValid) {
      Alert.alert('Error', 'Please fill in all data points with valid values');
      return;
    }

    const formattedData = dataPoints.map(point => ({
      value: parseFloat(point.value),
      label: point.label,
      frontColor: '#007bff',
      color: '#007bff'
    }));

    onAddGraph({
      type: selectedGraph,
      title: graphTitle,
      data: formattedData
    });

    // Reset form
    setStep(1);
    setSelectedGraph(null);
    setGraphTitle('');
    setDataPoints([{ label: '', value: '' }]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 1 ? 'Select Graph Type' : 'Enter Graph Data'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 1 ? (
            <View style={styles.graphTypeContainer}>
              {graphTypes.map((graph) => (
                <TouchableOpacity
                  key={graph.type}
                  style={[
                    styles.graphTypeButton,
                    selectedGraph === graph.type && styles.selectedGraphType
                  ]}
                  onPress={() => {
                    setSelectedGraph(graph.type);
                    setStep(2);
                  }}
                >
                  <Text style={styles.graphIcon}>{graph.icon}</Text>
                  <Text style={styles.graphTypeText}>{graph.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter graph title"
                value={graphTitle}
                onChangeText={setGraphTitle}
              />

              {dataPoints.map((point, index) => (
                <View key={index} style={styles.dataPointContainer}>
                  <TextInput
                    style={[styles.input, styles.dataPointInput]}
                    placeholder="Label"
                    value={point.label}
                    onChangeText={(value) => updateDataPoint(index, 'label', value)}
                  />
                  <TextInput
                    style={[styles.input, styles.dataPointInput]}
                    placeholder="Value"
                    keyboardType="numeric"
                    value={point.value}
                    onChangeText={(value) => updateDataPoint(index, 'value', value)}
                  />
                </View>
              ))}

              <TouchableOpacity 
                onPress={addDataPoint}
                style={styles.addDataButton}
              >
                <Text style={styles.addDataButtonText}>+ Add Data Point</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSubmit}
                style={styles.submitButton}
              >
                <Text style={styles.submitButtonText}>Create Graph</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  graphTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
  graphTypeButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  selectedGraphType: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  graphIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  graphTypeText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dataPointContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dataPointInput: {
    flex: 1,
    marginBottom: 0,
  },
  addDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  addDataButtonText: {
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
};

export default DynamicGraphs;