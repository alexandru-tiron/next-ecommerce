# Facturis Online API Integration

This document provides instructions on how to set up and configure the Facturis Online API integration with your Firebase Cloud Functions.

## Overview

The integration allows automatic generation of invoices when orders are accepted. It uses the Facturis Online API to create invoices based on order data stored in Firestore.

## Prerequisites

1. A Facturis Online account with API access
2. Your API key from Facturis Online
3. Firebase project with Cloud Functions and Firestore

## Configuration Steps

### 1. Set up Firebase Environment Variables

You need to set up the following environment variables in Firebase:

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set environment variables
firebase functions:secrets:set FACTURIS_API_KEY
# When prompted, enter your Facturis API key

# Set configuration variables
firebase functions:config:set facturis.username="YOUR_FACTURIS_USERNAME"
firebase functions:config:set facturis.password="YOUR_FACTURIS_PASSWORD"
firebase functions:config:set facturis.cui="YOUR_COMPANY_CUI"
```

Replace the values with your actual Facturis Online credentials.

### 2. Update .env.local file for development

For local development, you'll need to update your `.env.local` file with the following values:

```
FACTURIS_API_KEY=your_api_key
FACTURIS_USERNAME=your_username
FACTURIS_PASSWORD=your_password
FACTURIS_CUI=your_cui
```

### 3. Adjust Invoice Settings (Optional)

You may want to customize the following parameters in the `createInvoice` function:

-  `facturi_serie`: The series for your invoices (default: "ONLINE")
-  `facturi_tva`: VAT inclusion flag (default: 1 for included)
-  `tva`: VAT rate percentage (default: 19 for Romania)

## Usage

The `createInvoice` function is designed to be called when an order is accepted. It takes an `orderId` parameter and handles the rest of the process:

1. Retrieves the order data from Firestore
2. Maps the order data to Facturis API format
3. Sends the data to Facturis API
4. Updates the order with invoice information

## Error Handling

The function includes comprehensive error handling for:

-  Authentication and permission issues
-  Invalid or missing order data
-  API errors from Facturis Online

Errors are logged for debugging purposes and appropriate error messages are returned to the client.

## Testing

To test the function:

1. Ensure you have set up all environment variables
2. Create a test order in the "accepted" status
3. Call the function with the orderId

```javascript
// Example function call from client
const createInvoice = httpsCallable(functions, "createInvoice");
createInvoice({ orderId: "your_order_id" })
   .then((result) => {
      console.log("Invoice created:", result.data);
   })
   .catch((error) => {
      console.error("Error creating invoice:", error);
   });
```

## Troubleshooting

-  **API Key Issues**: Ensure your API key is correct and has the proper permissions
-  **Format Errors**: Check the mapping between your order data and Facturis API requirements
-  **Network Issues**: Verify your Firebase function has outbound network access
