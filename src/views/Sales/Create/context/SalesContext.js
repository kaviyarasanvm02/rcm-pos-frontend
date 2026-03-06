import React, { createContext, useCallback, useState, useContext } from 'react';
import { produce } from "immer";
import { getTotalQuantity as getTotalQuantityUtil, getTaxableAmount as getTaxableAmountUtil,
  getTotalTax as getTotalTaxUtil, getTotalAmount, getTotalAmountbyTotalPrice } from "../../../common-utils/calculations.util.js";
import { portalModules, PRECISION, isGrossPriceEnabled } from "../../../../config/config.js";
import { AppSync } from 'aws-sdk';
import { createSharedParkTransactions, getSharedParkTransactions, deleteSharedParkTransaction } from '../../../../helper/park-transactions.js';
import { getParkTransInvoiceRequest } from '../../../common-utils/prepare-payload.util.js';
import { useQueryClient } from "@tanstack/react-query";
import { getAvailableStock } from '../../../../helper/items-helper.js';

export const SalesContext = createContext();

export const SalesProvider = ({ children }) => {
  const LS_PARKED_TRX = "parkedTrxs";
  const queryClient = useQueryClient();

  const [customer, setCustomer] = useState("");
  const [salesItems, setItem] = useState([]);
  const [salesHeader, setHeader] = useState({});
  const [warehouseCode, setWarehouseCode] = useState("");
  const [paymentInfo, setPaymentInfo] = useState({});
  const [cardPaymentInfo, setCardPaymentInfo] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0); //Currently NOT used in any components
  const [taxProp, setTaxProp] = useState("");
  const [invoiceResponse, setInvoiceResponse] = useState("");
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(true);
  const [isCODCustomer, setIsCODCustomer] = useState(false);
  const [oneTimeCustomerDetails, setOneTimeCustomerDetails] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [parkedTransaction, setParkedTransaction] = useState([]);
  const [parkTransactionResponse, setParkTransactionResponse] = useState("");
  const [timYardTransaction, setTimYardTransaction] = useState({});
  const [warningMsg, setWarningMsg] = useState("");
  const [isEditQuotation, setIsEditQuotation] = useState(false);
  const [sqDocNum, setSQDocNum] = useState("");
  
  const setSalesCustomer = (customer) => {
    setCustomer(customer);
  }

  const setBulkOneTimeCustomerDetails = (fields) => {
    setOneTimeCustomerDetails(prev => ({ ...prev, ...fields }));
  }

  const setSalesHeader = (propName, value) => {
    setHeader({ ...salesHeader, [propName]: value });
  } 

  const setBulkSalesHeaders = (headers) => {
    setHeader(headers);
  }

  const setTimYardTransactions = (itemCode, newArray) => {
    setTimYardTransaction((prev) => ({
      ...prev,
      [itemCode]: newArray, // Cumulate arrays into the object by itemCode
    }));
  }

  const setParkedTrans = (propName, value) => {
    setParkedTransaction(parkedTransaction => ({
      ...parkedTransaction,
      [propName]: value,
    }));
  }

  const resetSalesHeader = () => {
    // Reset the details other than `SalesPersonCode`
    setHeader({ SalesPersonCode: salesHeader.SalesPersonCode });
  }

  const clearSalesHeader = () => {
    // Reset the details other than `SalesPersonCode`
    setHeader({ SalesPersonCode: "" });
  }

  const getPaidAmount = () => {
    let amountPaid = 0;

    // Cash
    if (paymentInfo.Cash && typeof paymentInfo.Cash === "object" && paymentInfo.Cash.amount !== undefined) {
      amountPaid += paymentInfo.Cash.amount ? parseFloat(paymentInfo.Cash.amount) : 0;
    }

    // Credit
    if (paymentInfo.Credit && typeof paymentInfo.Credit === "object" && paymentInfo.Credit.amount !== undefined) {
      amountPaid += paymentInfo.Credit.amount ? parseFloat(paymentInfo.Credit.amount) : 0;
    }

    // Check
    if (paymentInfo.Cheque && typeof paymentInfo.Cheque === "object" && paymentInfo.Cheque.amount !== undefined) {
      amountPaid += paymentInfo.Cheque.amount ? parseFloat(paymentInfo.Cheque.amount) : 0;
    }

    // Card Payments
    if (Array.isArray(cardPaymentInfo)) {
        //console.log("Card Payment entry: ", entry.amount);
        amountPaid += cardPaymentInfo.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
    }
    return amountPaid;
  };

  /**
   * Invoice Total Quantity
   * @returns 
   */
  const getTotalQuantity = () => {
    return getTotalQuantityUtil(salesItems);
  }

  /**
   * Invoice Total Tax Amount
   * @returns 
   */
  const getTaxableAmount = () => {
    return getTaxableAmountUtil(salesItems);
  }

  /**
   * Calculates Total Tax based on the Total Amount & Tax%
   * @returns 
   */
  const getTotalTax = () => {
    return getTotalTaxUtil(salesItems, taxProp);
  }

  /**
   * Adds the Tax% with Total Price and returns the value
   * @returns 
   */
  const getTotalInvoiceAmount = (precision) => {
    return isGrossPriceEnabled ? getTotalAmountbyTotalPrice(salesItems, taxProp, precision) : getTotalAmount(salesItems, taxProp, precision);
  }

  /** NOTE: Memoized funct. will always refer to the same funct. instance throughout the component's
   * lifecycle. It won't be re-created on re-renders.
   * 
   * `useCallback` is used to memoize functions. It returns a memoized version of the function that only 
   * changes if one of the dependencies has changed. This can help avoid unnecessary re-creation of funct. 
   * references.
   * 
   * Useful for passing stable callbacks to child components, preventing re-renders when props change
   * 
   **/
  const setSalesItem = useCallback((newItem) => {
    setItem(
      //Using `immer` to update the array in the state without mutating it
      (produce(draft => {
        draft.push(newItem);
      }))
    );
    setWarningMsg("");
  //passing an empty dependency array means, the function will be created once during the initial render
  //and will not change for subsequent renders
  }, []);

  const setBulkSalesItem = (items) => {
    setItem(items);
  }

  const updateSalesItem = useCallback((index, updatedItem) => {
    // console.log(`Context - updateSalesItem:  updatedItem: ${JSON.stringify(updatedItem)}`);
    //`immer` creates a draft copy of the original array, which you can modify in a mutable style
    setItem(
      produce(draft => {
        // draft[index][property] = value; //replace the old value with the updated one
        draft.splice(index, 1, updatedItem); //replace the old item with the updated one
      })
    );
  }, []);

  const deleteSalesItem = useCallback((index) => {
    setItem(
      produce((draft => {
        draft.splice(index, 1);
      }))
    );
    setWarningMsg("");
  }, []);

  const resetItems = () => {
    setItem([]);
  }

  /**
   * Add the `current` Customer & Items to LocalStorage & remove them from the `context`
   */
  const handleParkTrx = async() => {
    if(Object.keys(customer).length > 0 || (Array.isArray(salesItems) && salesItems.length > 0)) {

      const request = getParkTransInvoiceRequest(customer, salesHeader, salesItems, customerAddress,
        isCODCustomer, oneTimeCustomerDetails, isOneTimeCustomer, parkedTransaction, portalModules.INVOICE);
        console.log("Create Park Transactions request: ", JSON.stringify(request));

      try {
        //Create Sales Quotation
        let response = "";
        response = await createSharedParkTransactions(request);
        console.log("Create Park Transactions Response: ", JSON.stringify(response));
        
        if (response) {
          setParkTransactionResponse(response);
        }
      }
      catch (err) {
        if (err.response?.data?.message) {
          setWarningMsg(err.response.data.message);
        }
        else {
          setWarningMsg(err);
        }
      }

      // Reset form
      setCustomer({});
      setItem([]);
      setHeader({}); // NOT setSalesHeader({})
      setCustomerAddress("");
      setIsOneTimeCustomer(true);
      setIsCODCustomer(false);
      setOneTimeCustomerDetails("");
      setParkedTransaction([]);
      setWarehouseCode("");
      setHeader({ SalesPersonCode: "" });
      // TODO: Display a msg that the Trx has been parked!
    }
  }
  
  /**
   * Sets the selected trx from the `localStorage` back to the `context`
   **/
  const resumeTrx = async(id) => {
    const selectedTrx = await getParkedTrxs(id);
    if(selectedTrx instanceof Object && !Array.isArray(selectedTrx)) {
      setCustomer(selectedTrx.data.customer);
      setWarehouseCode(selectedTrx.data.salesItems[0].WhsCode)
      setItem(selectedTrx.data.salesItems);
      setHeader(selectedTrx.data.salesHeader); // NOT setSalesHeader({})
      setCustomerAddress(selectedTrx.data.customerAddress);
      setIsOneTimeCustomer(selectedTrx.data.isOneTimeCustomer);
      setIsCODCustomer(selectedTrx.data.isCODCustomer);
      setOneTimeCustomerDetails(selectedTrx.data.oneTimeCustomerDetails);
      setParkedTransaction(selectedTrx.data.parkedTransaction);
      //Remove the selected trx from the localStorage
      deleteParkedTrx(id);
    }
  }

  /**
   * 
   * @returns Parked Trx count
   */
  const getParkedTrxCount = () => {
    let parkedTrxsCount = 0;
    let parkedTrxs = localStorage.getItem(LS_PARKED_TRX);
    if(parkedTrxs) {
      parkedTrxs = JSON.parse(parkedTrxs);
      if(Array.isArray(parkedTrxs)) {
        parkedTrxsCount = parkedTrxs.length;
      }
    }
    return parkedTrxsCount;
  }

  /**
   * Get Parked Trxs from the DB
   * @returns Parked Trx count
   */
    const getParkedTrxs = async(id=-1) => {
    let trxs = [];
    try {

      let parkedTrxs = await getSharedParkTransactions();
      if(parkedTrxs) {

        if(Array.isArray(parkedTrxs)) {

          //Return the trx at a specified position if a valid index is passed
          // Convert the 'data' field to a JSON object
          parkedTrxs = parkedTrxs.map(entry => {
            return {
                ...entry,
                data: JSON.parse(entry.data)
            };
          });

          if(id > -1) {
            trxs = parkedTrxs.find(entry => entry.parkedTransactionId === id);
          }
          //or return the entire trx list
          else {
            trxs = parkedTrxs;
          }
        }
      }
    }
    catch(err) {
        setWarningMsg(err?.message);
    }
    return trxs;
  }

  /**
   * Add the `current` Customer & Items to LocalStorage & remove them from the `context`
   */
  const deleteParkedTrx = async(id) => {

    try {
      //Create Sales Quotation
      let response = "";
      response = await deleteSharedParkTransaction(id);
      if (response.data) {
        return response.data.affected;
      }
      return;
    }
    catch (error) {
      throw error;
    }
  }

  /**
   * Validates if quantity exceeds available stock for given item and warehouse
   */
  const validateQuantityAgainstStock = async (itemCode, whsCode, quantity, isInvItem, lineNumber = null) => {
    if(isInvItem !== 'Y') {
      return { isValid: true, message: "" }; // Non-inventory items do not
    }
    let cachedStockData = queryClient.getQueryData(["stockAvailabilityInfo", itemCode]);
    
    if (!cachedStockData || !Array.isArray(cachedStockData)) {
      try {
        const stockResponse = await getAvailableStock(itemCode);
        if (stockResponse && Array.isArray(stockResponse)) {
          queryClient.setQueryData(["stockAvailabilityInfo", itemCode], stockResponse);
          cachedStockData = stockResponse;
        } else {
          return { isValid: false, message: "Unable to fetch stock information" };
        }
      } catch (error) {
        return { isValid: false, message: "Error fetching stock information" };
      }
    }

    const warehouseStock = cachedStockData.find(stock => 
      stock.ItemCode === itemCode && stock.WhsCode === whsCode
    );

    if (!warehouseStock) {
      return { isValid: false, message: `No stock found for item ${itemCode} in warehouse ${whsCode}` };
    }

    const availableQty = parseFloat(warehouseStock.OnHand) || 0;
    const requestedQty = parseFloat(quantity) || 0;

    if (requestedQty > availableQty) {
      const lineText = lineNumber ? lineNumber : "";
      return { 
        isValid: false, 
        message: `Insufficient stock at line# ${lineText}! Available: ${availableQty}, Requested: ${requestedQty} for item ${itemCode} in warehouse ${whsCode}` 
      };
    }

    return { isValid: true, message: "" };
  }

  /**
   * Validates all sales items against available stock
   */
  const validateAllItemsStock = async () => {
    const validationErrors = [];
    
    for (let i = 0; i < salesItems.length; i++) {
      const item = salesItems[i];
      const validation = await validateQuantityAgainstStock(item.ItemCode, item.WhsCode, item.Quantity, item.InvntItem,i + 1);
      if (!validation.isValid) {
        validationErrors.push(validation.message);
      }
    }
    
    return validationErrors;
  }

  return (
    <SalesContext.Provider
      value={{
        customer, setSalesCustomer,
        warehouseCode, setWarehouseCode,
        salesItems, setSalesItem, setItem, setBulkSalesItem,
        salesHeader, setSalesHeader, resetSalesHeader, setBulkSalesHeaders, clearSalesHeader,
        updateSalesItem, deleteSalesItem,
        paidAmount, setPaidAmount,
        paymentInfo, setPaymentInfo, getPaidAmount,cardPaymentInfo, setCardPaymentInfo,
        getTotalQuantity, getTaxableAmount, getTotalTax, getTotalInvoiceAmount,
        taxProp, setTaxProp, 
        invoiceResponse, setInvoiceResponse,
        isOneTimeCustomer, setIsOneTimeCustomer,
        isCODCustomer, setIsCODCustomer,
        oneTimeCustomerDetails, setOneTimeCustomerDetails,
        customerAddress, setCustomerAddress,
        handleParkTrx, getParkedTrxCount, getParkedTrxs, deleteParkedTrx, resumeTrx, resetItems,
        parkedTransaction, setParkedTrans, timYardTransaction, setTimYardTransactions,
        isEditQuotation, setIsEditQuotation, sqDocNum, setSQDocNum, setBulkOneTimeCustomerDetails,
        validateQuantityAgainstStock, validateAllItemsStock, warningMsg, setWarningMsg
      }}
    >
      { children }
    </SalesContext.Provider>
  );
}
