import React, { useContext, useEffect, useState } from "react";
import { Input, InputGroup, InputGroupAddon, InputGroupText, Table, CustomInput } from "reactstrap";
import { Trash2 } from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { getDiscountAmount, getTaxAmount, getTotalPrice, getNetUnitPrice, getNetUnitPricebyRoundTotalPrice, getTaxAmountbyTotalPrice, roundPrice, getTaxAmountbyTotalGrossPrice } from "../../../common-utils/calculations.util.js";
import { systemCurrency, currencySymbols, TOTAL_AMT_PRECISION, isGrossPriceEnabled } from "../../../../config/config.js";
import { round } from "../../../../config/util.js";
import { PRECISION, TAX_PROPS } from "../../../../config/config.js";

import TaxDropdown from "../../../components/TaxDropdown";
import { ReturnsContext } from "./../context/ReturnsContext";
import ReturnReasonsDropdown from "../../../components/POS/ReturnReasonsDropdown.js";

const ItemsTable = ({ setWarningMsg }) => {
  const { returnsItems, setReturnsItems, deleteReturnsItem, updateReturnsItem, getTotalQuantity, getTaxableAmount,
    getTotalTax, getTotalAmount,
    taxProp, setTaxProp } = useContext(ReturnsContext);

  const [currency, setCurrency] = useState(systemCurrency); // If required, change this via `props`

  const handleDelete = (key) => {
    deleteReturnsItem(key);
  }

  const handleItemSelection = (index, item, event) => {
    setWarningMsg("");
    const { checked } = event.target;
    const updatedItem = { ...item };

    // `U_RemainingOpenQty` will be null when there's no Return req. placed for the row before
    if(checked && (item.U_RemainingOpenQty === null || item.U_RemainingOpenQty > 0)) {
      updatedItem.isSelectedForReturn = true;
      // Set the Remaining Open Qty as the Invoice Qty. This value will be set when a Return was already
      // created for the current row
      updatedItem.Quantity = item.U_RemainingOpenQty ? item.U_RemainingOpenQty : item.Quantity;
      updatedItem.InvoiceQuantity = item.U_RemainingOpenQty ? item.U_RemainingOpenQty : item.Quantity;
      updatedItem.InvoiceTax = item[taxProp];

      const totalPrice = round(getTotalPrice(item.Quantity, item.PriceBeforDiscount, item.DiscountPercent), TOTAL_AMT_PRECISION); // Remove `taxAmount` from Total
      const taxAmount = isGrossPriceEnabled ? getTaxAmountbyTotalGrossPrice(item.PriceBeforDiscount, item.Quantity, item.TaxPercent) : round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION);
      const netUnitPrice = isGrossPriceEnabled ? getNetUnitPricebyRoundTotalPrice(item.PriceBeforDiscount, item.Discount, 0) : getNetUnitPricebyRoundTotalPrice(item.PriceBeforDiscount, 0, item.TaxPercent);
      const priceAfterVat = getTotalPrice(1, item.Price, item.Discount);

      updatedItem[taxProp] = taxAmount;
      updatedItem.NetUnitPrice = netUnitPrice; // Price per Qty after Discount & Tax
      updatedItem.TotalPrice = totalPrice;
      updatedItem.TotalPriceWithTax = isGrossPriceEnabled ? priceAfterVat : totalPrice + taxAmount; // Total Price with Tax
    }
    // Set back the original valules to the row
    else {
      // const taxAmount = getTaxAmount(item.InvoiceQuantity, item.Price, 0, item.TaxPercent);
      updatedItem.isSelectedForReturn = false;
      updatedItem.Quantity = item.InvoiceQuantity;
      updatedItem.DiscountPercent = 0;
      updatedItem.DiscountAmount = 0;
      updatedItem[taxProp] = item.InvoiceTax;
      updatedItem.TotalPrice = 0;
    }
    updateReturnsItem(index, updatedItem);
  }
  
  const handleChange = (index, item, event) => {
    const { name, value } = event.target;
    console.log("handleChange: ", index, "|", name, "|", value);
    if(value) {
      const updatedItem = {
        ...item,
        [name]: value,
      };
      updateReturnsItem(index, updatedItem);
    }
  }

  const handleQuantityChange = (index, item, event) => {
    const quantity = parseFloat(event.target.value);
    if(quantity > 0 && quantity <= item.InvoiceQuantity) {
      const totalPrice = round(getTotalPrice(quantity, item.PriceBeforDiscount, item.DiscountPercent), TOTAL_AMT_PRECISION); // Remove `taxAmount` from Total
      const taxAmount = isGrossPriceEnabled ? getTaxAmountbyTotalGrossPrice(item.PriceBeforDiscount, quantity, item.TaxPercent) : round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION);
      const priceAfterVat = getTotalPrice(1, item.Price, item.Discount);

      const updatedItem = {
        ...item,
        Quantity: quantity,
        [taxProp]: taxAmount,
        TotalPrice: totalPrice,
        TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice+taxAmount
      };
      updateReturnsItem(index, updatedItem);
    }
  }

  /**
 * Sets the selected Tax to the item
 * @param {String} propName
 * @param {Object} tax
 * @param {Number} index
 */
  const handleTaxChange = (propName, tax, index) => {
    console.log("handleTaxChange - Code:", tax);
    let taxCode = "", taxRate = "";
    if(tax) {
      taxCode = tax.Code;
      taxRate = round(tax.Rate, PRECISION);
    }

    const item = returnsItems[index];
    const taxAmount = getTaxAmount(item.Quantity, item.PriceBeforDiscount, item.DiscountPercent, taxRate);
    const totalPrice = getTotalPrice(item.Quantity, item.PriceBeforDiscount, item.DiscountPercent); // Removed `taxAmount` from total
    
    const updatedItem = {
      ...returnsItems[index],
      [propName]: taxCode,
      TaxPercent: taxRate,
      [taxProp]: taxAmount,
      TotalPrice: totalPrice,
      TotalPriceWithTax: totalPrice+taxAmount
    };
    updateReturnsItem(index, updatedItem);
  }

  const handleDiscountChange = (index, item, discount) => {
    const totalPrice = round(getTotalPrice(item.Quantity, item.PriceBeforDiscount, discount), TOTAL_AMT_PRECISION); // Removed `taxAmount` from total
    const taxAmount = isGrossPriceEnabled ? getTaxAmountbyTotalGrossPrice(item.PriceBeforDiscount, item.Quantity, item.TaxPercent) : round(getTaxAmountbyTotalPrice(totalPrice, item.TaxPercent), TOTAL_AMT_PRECISION);
    const discountAmount = getDiscountAmount(item.Quantity, item.PriceBeforDiscount, discount, item.TaxPercent);
    const netUnitPrice = isGrossPriceEnabled ? getNetUnitPricebyRoundTotalPrice(item.PriceBeforDiscount, discount, 0) :  getNetUnitPricebyRoundTotalPrice(item.PriceBeforDiscount, discount, item.TaxPercent);
    const priceAfterVat = getTotalPrice(1, item.PriceBeforDiscount, item.Discount);

    const updatedItem = {
      ...item,
      DiscountPercent: discount,
      DiscountAmount: discountAmount,
      [taxProp]: taxAmount,
      NetUnitPrice: netUnitPrice, // Price per Qty after Discount & Tax
      TotalPrice: totalPrice, // Price for all the Qtys after Discount
      TotalPriceWithTax: isGrossPriceEnabled ? priceAfterVat : totalPrice+taxAmount // Price for all the Qtys after Discount + Tax
    };
    updateReturnsItem(index, updatedItem);
  }

  // Set Tax Prop based on the currency
  useEffect(() => {
    if (currency === systemCurrency)
      setTaxProp(TAX_PROPS.TaxLocal);
    else
      setTaxProp(TAX_PROPS.TaxForeign);
  }, []);
 
  //"Tax%",
  const columns = ["", "#", "Item", "Quantity", "Discount%", "Discount", "Return Reason",
    "Net Unit Price", "Total"]; //"Tax%", "Tax Amount", 

  // console.log("returnsItems: ", returnsItems);
  return (
    <div className="table-fixed-head"> {/** recent-table  */}
      <Table size="sm" responsive className="align-items-center table-flush">
        <colgroup>
          <col style={{ width: "2%" }} />
          <col style={{ width: "2%" }} />  {/** # */}
          <col style={{ width: "18%" }} /> {/* Item Name */}
          <col style={{ width: "15%" }} /> {/* Quantity */}
          <col style={{ width: "15%" }} /> {/* Price */}
          {/* <col style={{ width: "14%" }} />  Tax Code */}
          {/* <col style={{ width: "10%" }} /> Tax Amt */}
          <col style={{ width: "20%" }} /> {/* DiscountPercent */}
          <col style={{ width: "12%" }} /> {/* Total Price */}
        </colgroup>
        <thead className="thead-light">
          <tr className="border-top-secondary">
            {columns.map(col => (
              <th>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.isArray(returnsItems) && returnsItems.length > 0 &&
          returnsItems.map((item, key) => (
            <tr key={item.LineNum} className={!item.isSelectedForReturn ? "text-muted" :  ""}>
              <td>
                {/* Enable the option only when Remaining Qty is > 0 */}
                {item.U_RemainingOpenQty === null || item.U_RemainingOpenQty > 0 ?
                  <CustomInput
                    inline
                    id={"invoiceItem"+key}
                    type="checkbox"
                    label=""
                    className="text-gray-dark" //display-4 
                    checked={item.isSelectedForReturn}
                    onChange={(e) => handleItemSelection(key, item, e)}
                    disabled={false}
                  />
                : "NA"
                }
              </td>
              <td>{key+1}</td>
              {/* <td style={{ width: "40%", whiteSpace: "unset" }}> */}
              {/* <td style={{ width: "50%", wordWrap: "break-word" }}> */}
              <td>
                <h5 className={`mb-0 ${!item.isSelectedForReturn ? "text-muted" : "text-primary"}`}>
                  {/* <Link to={`${process.env.PUBLIC_URL}/app/ecommerce/orderhistory`}>{item.title}</Link> */}
                  {item.ItemName}
                </h5>
                <span className="font-light">Code : {item.ItemCode}</span>&emsp;|&emsp;
                <span className="font-light font-weight-800">WH: {item.WhsCode}</span>
              </td>
              {/* <td>{item.OpenQty}</td> */}
              <td>
                <Input
                  size="sm"
                  type="number"
                  value={!item.isSelectedForReturn
                      ? item.U_RemainingOpenQty === null ? item.Quantity : item.U_RemainingOpenQty
                      : item.Quantity}
                  onChange={(e) => handleQuantityChange(key, item, e)}
                  disabled={!item.isSelectedForReturn}
                />
                {item.isSelectedForReturn && <small>Invoice Qty: {round(item.InvoiceQuantity, PRECISION)}</small> }
              </td>
              {/* <td className="font-weight-500">
                {currencySymbols[systemCurrency]} {round(item.Price, PRECISION)}
              </td> */}
              {/* <td>{round(item.TaxPercent)} %</td> */}
              {/* <td>{currencySymbols[systemCurrency]} {round(item[taxProp], PRECISION)}</td> */}
              {/* <td>{round(item.DiscountPercent, PRECISION)} %</td> */}
              <td>
                <div style={{ position: "relative", display: "inline-block" }}>
                <InputGroup size="sm">
                  <Input
                    size="sm"
                    // style={{ width: "70%" }}
                    type="number"
                    value={item.DiscountPercent}
                    onChange={(e) => handleDiscountChange(key, item, e.target.value)}
                    disabled={!item.isSelectedForReturn}
                  />
                   <InputGroupAddon addonType="append">
                    <InputGroupText>
                      %
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                </div>
              </td>
              <td>{currencySymbols[systemCurrency]} {round(item.DiscountAmount, PRECISION)}</td>
              <td>
                <ReturnReasonsDropdown
                  index={key}
                  item={item}
                  name="U_ReturnReason"
                  value={item.U_ReturnReason}
                  handleChange={handleChange}
                  disabled={!item.isSelectedForReturn}
                />
              </td>
              {/* <td>
                {currencySymbols[systemCurrency]}&nbsp;
                {item.isSelectedForReturn ? round(item.TotalPrice, PRECISION) : round(item.LineTotal, PRECISION)}
              </td> */}
              
              {/* Price per `quantity` after the tax is added and discount subtracted */}
              <td>
                {currencySymbols[systemCurrency]} {round(item.NetUnitPrice, PRECISION)}
              </td>
              {/* <td>{currencySymbols[systemCurrency]} {round(item.TotalPriceWithTax, PRECISION)}</td> */}
              <td>
                {/* {currencySymbols[systemCurrency]} {round(parseFloat(item.TotalPrice) + parseFloat(item[taxProp]), PRECISION)} */}
                {/* {currencySymbols[systemCurrency]} {round(parseFloat(item.LineTotal) + parseFloat(item[taxProp]), PRECISION)} */}
                {currencySymbols[systemCurrency]}&nbsp;
                {item.isSelectedForReturn
                  //  ? round(item.TotalPriceWithTax, PRECISION)
                   ? round(parseFloat(item.TotalPrice) + parseFloat(item[taxProp]), PRECISION)
                  : round(parseFloat(item.LineTotal) + parseFloat(item[taxProp]), PRECISION)}
              </td>
              {/* <td>
                <span onClick={() => handleDelete(key)}>
                  <FontAwesomeIcon icon={faTrashCan} size={"2x"} className="text-danger cursor-pointer" />
                </span>
              </td> */}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-weight-700">
            <td colSpan={2}></td>
            <td className="text-right">Total Qty</td>
            <td>{getTotalQuantity()}</td>
            <td colSpan={4} className="text-right">Total Value</td>
            <td>{currencySymbols[systemCurrency]} {getTotalAmount()}</td>
            {/* <td colSpan={2} className="text-right">Taxable Amount</td>
            <td>{currencySymbols[systemCurrency]} {getTaxableAmount()}</td> */}
          </tr>
          <tr className="font-weight-700">
            <td colSpan={columns.length-1} className="text-right text-primary">Rounded Value</td>
            <td className="text-primary">{currencySymbols[systemCurrency]} {roundPrice(getTotalAmount(), 2)}</td>
          </tr>
          {/* <tr>
            <td colSpan={columns.length-2} className="text-right">Total Tax</td>
            <td>{currencySymbols[systemCurrency]} {getTotalTax()}</td>
          </tr>
          <tr className="font-weight-700 text-primary">
            <td colSpan={columns.length-2} className="text-right">Total Value</td>
            <td>{currencySymbols[systemCurrency]} {getTotalAmount()}</td>
          </tr> */}
        </tfoot>
      </Table>
    </div>
  );
};

export default ItemsTable;
